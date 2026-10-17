import path from "node:path";
import { app, ipcMain, shell, type BrowserWindow } from "electron";
import type { AppInfo, LeftoverItem, ScanResult } from "../shared/contracts";
import { scanApps } from "./app-scanner";
import { readAppMetadata } from "./app-metadata";
import { appRoots, leftoverRoots } from "./roots";
import { scanLeftovers } from "./leftover-scanner";
import { validateTarget } from "./path-validator";
import { isAppRunning, quitApp } from "./process-manager";
import { removeSelected } from "./removal";
import { fsAdapter } from "./filesystem";

const trashLog: string[] = [];
const appCache = new Map<string, AppInfo>();

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle("app:list", listApps);
  ipcMain.handle("app:scan", async (_event, appPath: string): Promise<ScanResult> => {
    const appInfo = await findApp(appPath);
    if (!appInfo.removable) throw new Error("System applications are read-only.");
    const result = await scanLeftovers(appInfo.name, appInfo.bundleId, leftoverRoots, fsAdapter);
    if (appInfo.removable) result.items.unshift(appItem(appInfo));
    return result;
  });
  ipcMain.handle("app:running", async (_event, appPath: string) => isAppRunning((await findApp(appPath)).path));
  ipcMain.handle("app:quit", async (_event, appPath: string) => {
    const found = await findApp(appPath);
    if (!found.removable) throw new Error("System applications cannot be quit from this app.");
    return quitApp(found.path);
  });
  ipcMain.handle("app:remove", async (_event, appPath: string, paths: string[], dryRun: boolean, permanent: boolean) => {
    const result = await removeSelected(await findApp(appPath), paths, dryRun, permanent, fsAdapter, getOwnBundlePath());
    if (!dryRun && !permanent) trashLog.push(...result.filter((item) => item.status === "trashed").map((item) => item.path));
    return result;
  });
  ipcMain.handle("app:reveal", async (_event, target: string) => revealPath(target));
  ipcMain.handle("app:privacy-settings", () => shell.openExternal(
    "x-apple.systempreferences:com.apple.preference.security?Privacy"
  ));
  ipcMain.handle("app:undo-log", () => [...trashLog]);
  ipcMain.on("app:open-dropped", async (_event, target: string) => {
    try {
      const found = await findApp(target);
      if (found.removable) getWindow()?.webContents.send("app:open-file", found.path);
    } catch (error) {
      getWindow()?.webContents.send("app:open-error", errorMessage(error));
    }
  });
}

async function listApps() {
  const result = await scanApps(appRoots, fsAdapter, readAppMetadata);
  const ownBundle = getOwnBundlePath();
  if (ownBundle) result.apps = result.apps.map((item) =>
    item.path === ownBundle ? { ...item, removable: false } : item
  );
  appCache.clear();
  result.apps.forEach((item) => appCache.set(item.path, item));
  return result;
}

async function findApp(appPath: string): Promise<AppInfo> {
  if (typeof appPath !== "string") throw new Error("Invalid application path.");
  const found = appCache.get(appPath) ?? (await listApps()).apps.find((item) => item.path === appPath);
  if (!found) throw new Error("That application is not in a supported Applications folder.");
  const root = appRoots.find((item) => isWithin(item.path, appPath));
  if (!root) throw new Error("Application path is outside a supported Applications folder.");
  const info = await fsAdapter.lstat(appPath);
  if (info.isSymbolicLink() || !info.isDirectory() || await fsAdapter.realpath(appPath) !== appPath) {
    throw new Error("The application path changed or resolves through a symlink.");
  }
  const ownBundle = getOwnBundlePath();
  if (found.removable) await validateTarget(appPath, [root.path], ownBundle ? [ownBundle] : [], fsAdapter);
  return found;
}

function appItem(appInfo: AppInfo): LeftoverItem {
  return {
    path: appInfo.path, location: path.dirname(appInfo.path), sizeBytes: appInfo.sizeBytes,
    confidence: "high", selected: true, manualOnly: false
  };
}

async function revealPath(target: string): Promise<void> {
  const roots = [
    ...leftoverRoots.map((root) => root.path),
    ...appRoots.filter((root) => root.removable).map((root) => root.path)
  ];
  const allowed = roots.filter((root) => target.startsWith(`${root}${path.sep}`));
  if (allowed.length === 0) throw new Error("That location cannot be revealed.");
  const ownBundle = getOwnBundlePath();
  const safePath = await validateTarget(target, allowed, ownBundle ? [ownBundle] : [], fsAdapter);
  shell.showItemInFolder(safePath);
}

function getOwnBundlePath(): string | null {
  const executable = app.getPath("exe");
  const match = executable.match(/^(.*?\.app)(?:\/|$)/);
  return match?.[1] ?? null;
}

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The dropped application could not be opened.";
}
