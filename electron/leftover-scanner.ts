import path from "node:path";
import type { LeftoverItem, ScanResult } from "../shared/contracts";
import { directorySize, type ScannerFileSystem } from "./app-scanner";
import { matchLeftover } from "./leftover-matcher";
import { validateTarget } from "./path-validator";
import type { leftoverRoots } from "./roots";
import { isPermissionError } from "./system-error";

type Root = (typeof leftoverRoots)[number];

export async function scanLeftovers(
  appName: string,
  bundleId: string,
  roots: Root[],
  io: ScannerFileSystem & { realpath(path: string): Promise<string> }
): Promise<ScanResult> {
  const items: LeftoverItem[] = [];
  const inaccessible: string[] = [];
  for (const root of roots) {
    let entries;
    try {
      entries = await io.readdir(root.path);
    } catch (error) {
      const code = errorCode(error);
      if (code === "ENOENT") continue;
      if (!isPermissionError(error)) throw error;
      inaccessible.push(root.path);
      continue;
    }
    for (const entry of entries) {
      if (entry.symlink) continue;
      const candidate = path.join(root.path, entry.name);
      const match = matchLeftover(candidate, appName, bundleId);
      if (!match.matched) continue;
      try {
        await validateTarget(candidate, [root.path], [], io);
        const sizeBytes = entry.directory ? await directorySize(candidate, io) : (await io.stat(candidate)).size;
        items.push({
          path: candidate, location: root.location, sizeBytes, confidence: match.confidence,
          selected: match.selected && !root.manualOnly, manualOnly: root.manualOnly
        });
      } catch (error) {
        if (isPermissionError(error)) inaccessible.push(candidate);
        else console.warn(`Could not inspect leftover ${candidate}:`, error);
      }
    }
  }
  return { items, inaccessible };
}

function errorCode(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
}
