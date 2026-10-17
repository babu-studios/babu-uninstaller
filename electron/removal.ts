import { rm } from "node:fs/promises";
import path from "node:path";
import { dialog, shell } from "electron";
import type { AppInfo, LeftoverItem, RemovalResult } from "../shared/contracts";
import { scanLeftovers } from "./leftover-scanner";
import { appAllowedRoots, leftoverRoots, protectedPaths } from "./roots";
import { validateTarget, type PathFileSystem } from "./path-validator";
import { isAppRunning } from "./process-manager";
import type { ScannerFileSystem } from "./app-scanner";

type RemovalFileSystem = ScannerFileSystem & PathFileSystem;

export async function removeSelected(
  appInfo: AppInfo,
  requested: string[],
  dryRun: boolean,
  permanent: boolean,
  io: RemovalFileSystem,
  ownBundlePath: string | null
): Promise<RemovalResult[]> {
  if (!appInfo.removable) throw new Error("System applications cannot be removed.");
  if (typeof dryRun !== "boolean" || typeof permanent !== "boolean") throw new Error("Invalid removal options.");
  if (!Array.isArray(requested) || requested.some((item) => typeof item !== "string") ||
      new Set(requested).size !== requested.length) throw new Error("Invalid removal selection.");
  if (await isAppRunning(appInfo.path)) throw new Error("Quit the application before removing it.");

  const scan = await scanLeftovers(appInfo.name, appInfo.bundleId, leftoverRoots, io);
  const selected = requested.map((target) =>
    (target === appInfo.path ? appItem(appInfo) : scan.items.find((item) => item.path === target))
  );
  if (selected.some((item) => !item || item.manualOnly)) throw new Error("The selection contains an unsafe or unavailable path.");
  const confirmed = selected as LeftoverItem[];
  if (permanent && !dryRun && !(await confirmPermanent(confirmed))) return [];

  const results: RemovalResult[] = [];
  for (const item of confirmed) {
    try {
      const target = await validateItem(item, appInfo, io, ownBundlePath);
      if (dryRun) results.push({ path: target, status: "dry-run", sizeBytes: item.sizeBytes });
      else if (permanent) {
        await rm(target, { recursive: true, force: false });
        results.push({ path: target, status: "deleted", sizeBytes: item.sizeBytes });
      } else {
        await shell.trashItem(target);
        results.push({ path: target, status: "trashed", sizeBytes: item.sizeBytes });
      }
    } catch (error) {
      results.push({ path: item.path, status: "failed", sizeBytes: item.sizeBytes, message: errorMessage(error) });
    }
  }
  return results;
}

function appItem(appInfo: AppInfo): LeftoverItem {
  return {
    path: appInfo.path, location: path.dirname(appInfo.path), sizeBytes: appInfo.sizeBytes,
    confidence: "high", selected: true, manualOnly: false
  };
}

async function validateItem(
  item: LeftoverItem, appInfo: AppInfo, io: RemovalFileSystem, ownBundlePath: string | null
): Promise<string> {
  const isApp = item.path === appInfo.path;
  const roots = isApp ? appAllowedRoots(appInfo.path) :
    leftoverRoots.filter((root) => item.path.startsWith(`${root.path}${path.sep}`)).map((root) => root.path);
  const protectedItems = isApp ? protectedPaths : [];
  return validateTarget(item.path, roots, [...protectedItems, ...(ownBundlePath ? [ownBundlePath] : [])], io);
}

async function confirmPermanent(items: LeftoverItem[]): Promise<boolean> {
  const { response } = await dialog.showMessageBox({
    type: "warning", title: "Permanently delete selected items?",
    message: "This cannot be undone. The listed items will be deleted permanently.",
    detail: items.map((item) => item.path).join("\n"),
    buttons: ["Cancel", "Delete permanently"], defaultId: 0, cancelId: 0
  });
  return response === 1;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected file-system error.";
}
