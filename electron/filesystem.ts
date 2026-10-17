import { execFile as callbackExecFile } from "node:child_process";
import { lstat, readdir, realpath, stat } from "node:fs/promises";
import { promisify } from "node:util";
import type { ScannerFileSystem } from "./app-scanner";
import { isPermissionError, permissionError } from "./system-error";

const execFile = promisify(callbackExecFile);

export const fsAdapter: ScannerFileSystem & { realpath(path: string): Promise<string> } = {
  readdir: async (directory) => (await readdir(directory, { withFileTypes: true })).map((entry) => ({
    name: entry.name, directory: entry.isDirectory(), symlink: entry.isSymbolicLink()
  })),
  stat: async (file) => {
    const info = await stat(file);
    return { size: info.size, mtime: info.mtime };
  },
  lstat,
  realpath,
  directorySize: async (directory) => {
    try {
      const { stdout } = await execFile("/usr/bin/du", ["-sk", directory], { timeout: 30_000, maxBuffer: 64 * 1024 });
      const blocks = Number(stdout.match(/^(\d+)/)?.[1]);
      if (!Number.isSafeInteger(blocks) || blocks < 0) throw new Error(`Could not measure directory size: ${directory}`);
      return blocks * 1024;
    } catch (error) {
      if (isPermissionError(error)) throw permissionError(error, directory);
      throw error;
    }
  }
};
