import path from "node:path";
import type { AppInfo, AppScanResult } from "../shared/contracts";
import { isPermissionError } from "./system-error";

export interface DirectoryEntry {
  name: string;
  directory: boolean;
  symlink: boolean;
}

export interface ScannerFileSystem {
  readdir(directory: string): Promise<DirectoryEntry[]>;
  stat(path: string): Promise<{ size: number; mtime: Date }>;
  lstat(path: string): Promise<{ isSymbolicLink(): boolean; isDirectory(): boolean }>;
  directorySize?(path: string): Promise<number>;
}

export interface AppMetadata {
  bundleId: string;
  version: string;
  iconDataUrl: string | null;
  lastOpened: string | null;
}

export async function scanApps(
  roots: { path: string; removable: boolean }[],
  io: ScannerFileSystem,
  readMetadata: (appPath: string) => Promise<AppMetadata>
): Promise<AppScanResult> {
  const apps: AppInfo[] = [];
  const inaccessible: string[] = [];
  for (const root of roots) {
    let entries: DirectoryEntry[];
    try {
      entries = await io.readdir(root.path);
    } catch (error) {
      const code = errorCode(error);
      if (code === "ENOENT") continue;
      if (!isPermissionError(error)) throw error;
      inaccessible.push(root.path);
      continue;
    }
    const candidates = entries.filter((entry) => entry.name.endsWith(".app") && entry.directory && !entry.symlink);
    for (let index = 0; index < candidates.length; index += 6) {
      await Promise.all(candidates.slice(index, index + 6).map(async (entry) => {
        const appPath = path.join(root.path, entry.name);
        const emptyMetadata: AppMetadata = { bundleId: "", version: "", iconDataUrl: null, lastOpened: null };
        let metadata = emptyMetadata;
        let sizeBytes: number | null = null;
        try {
          if (!(await io.lstat(appPath)).isDirectory()) return;
        } catch (error) {
          if (isPermissionError(error)) inaccessible.push(appPath);
          else console.warn(`Could not inspect application folder ${appPath}:`, error);
        }
        try { metadata = await readMetadata(appPath); }
        catch (error) {
          if (isPermissionError(error)) inaccessible.push(appPath);
          else console.warn(`Could not read application metadata ${appPath}:`, error);
        }
        try { sizeBytes = await directorySize(appPath, io); }
        catch (error) {
          if (isPermissionError(error)) inaccessible.push(appPath);
          else console.warn(`Could not measure application ${appPath}:`, error);
        }
        apps.push({
          id: appPath, path: appPath, name: entry.name.slice(0, -4), bundleId: metadata.bundleId,
          version: metadata.version, sizeBytes, lastOpened: metadata.lastOpened,
          removable: root.removable, iconDataUrl: metadata.iconDataUrl
        });
      }));
    }
  }
  return { apps: apps.sort((a, b) => a.name.localeCompare(b.name)), inaccessible: [...new Set(inaccessible)] };
}

function errorCode(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
}

export async function directorySize(directory: string, io: ScannerFileSystem): Promise<number> {
  if (io.directorySize) return io.directorySize(directory);
  let size = 0;
  for (const entry of await io.readdir(directory)) {
    const child = path.join(directory, entry.name);
    if (entry.symlink) continue;
    if (entry.directory) size += await directorySize(child, io);
    else size += (await io.stat(child)).size;
  }
  return size;
}
