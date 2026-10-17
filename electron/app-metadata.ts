import { execFile as callbackExecFile } from "node:child_process";
import { lstat } from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";
import { nativeImage } from "electron";
import { parse } from "plist";
import type { AppMetadata } from "./app-scanner";
import { isPermissionError, permissionError } from "./system-error";

const execFile = promisify(callbackExecFile);

export async function readAppMetadata(appPath: string): Promise<AppMetadata> {
  const infoPath = path.join(appPath, "Contents", "Info.plist");
  const raw = parse(await readPlist(infoPath));
  if (typeof raw !== "object" || raw === null) throw new Error(`Invalid app metadata: ${appPath}`);
  const info = raw as Record<string, unknown>;
  const icon = stringValue(info.CFBundleIconFile);
  let iconDataUrl: string | null = null;
  if (icon && path.basename(icon) === icon) {
    const filename = path.extname(icon) ? icon : `${icon}.icns`;
    const iconPath = path.join(appPath, "Contents", "Resources", filename);
    const stat = await lstat(iconPath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (stat && !stat.isSymbolicLink()) {
      const image = nativeImage.createFromPath(iconPath);
      if (!image.isEmpty()) iconDataUrl = image.toDataURL();
    }
  }

  return {
    bundleId: stringValue(info.CFBundleIdentifier),
    version: stringValue(info.CFBundleShortVersionString) || stringValue(info.CFBundleVersion),
    iconDataUrl,
    lastOpened: await readLastOpened(appPath)
  };
}

async function readPlist(infoPath: string): Promise<string> {
  try {
    const { stdout } = await execFile("/usr/bin/plutil", ["-convert", "xml1", "-o", "-", infoPath], {
      timeout: 2500, maxBuffer: 1024 * 1024
    });
    return stdout;
  } catch (error) {
    if (isPermissionError(error)) throw permissionError(error, infoPath);
    throw error;
  }
}

async function readLastOpened(appPath: string): Promise<string | null> {
  try {
    const { stdout } = await execFile("/usr/bin/mdls", ["-raw", "-name", "kMDItemLastUsedDate", appPath], {
      timeout: 2500, maxBuffer: 64 * 1024
    });
    const value = stdout.trim();
    if (!value || value === "(null)") return null;
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : date.toISOString();
  } catch (error) {
    console.warn(`Could not read last-opened date for ${appPath}:`, error);
    return null;
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
