import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanApps, type DirectoryEntry, type ScannerFileSystem } from "../electron/app-scanner";

const files: Record<string, DirectoryEntry[]> = {
  "/fixtures/Applications": [
    { name: "Editor.app", directory: true, symlink: false },
    { name: "Link.app", directory: true, symlink: true },
    { name: "Not an app", directory: true, symlink: false }
  ],
  "/fixtures/Applications/Editor.app": [{ name: "Contents", directory: true, symlink: false }],
  "/fixtures/Applications/Editor.app/Contents": [{ name: "Info.plist", directory: false, symlink: false }]
};

function fixtureFs(): ScannerFileSystem {
  return {
    readdir: async (directory) => files[directory] ?? [],
    stat: async () => ({ size: 12, mtime: new Date(0) }),
    lstat: async () => ({ isSymbolicLink: () => false, isDirectory: () => true })
  };
}

describe("scanApps", () => {
  it("scans fake app fixtures, counts files, and skips symlink apps", async () => {
    const result = await scanApps([{ path: "/fixtures/Applications", removable: true }], fixtureFs(), async () => ({
      bundleId: "com.example.editor", version: "2.0", iconDataUrl: null, lastOpened: null
    }));
    expect(result.apps).toHaveLength(1);
    expect(result.apps[0]).toMatchObject({
      name: "Editor", path: path.join("/fixtures/Applications", "Editor.app"), sizeBytes: 12, removable: true
    });
    expect(result.inaccessible).toEqual([]);
  });

  it("keeps system apps visible but read-only", async () => {
    const result = await scanApps([{ path: "/fixtures/Applications", removable: false }], fixtureFs(), async () => ({
      bundleId: "com.apple.example", version: "1", iconDataUrl: null, lastOpened: null
    }));
    expect(result.apps[0].removable).toBe(false);
  });

  it("keeps apps listed when protected directories prevent size measurement", async () => {
    const io: ScannerFileSystem = {
      ...fixtureFs(),
      directorySize: async () => { throw Object.assign(new Error("denied"), { code: "EACCES" }); }
    };
    const result = await scanApps([{ path: "/fixtures/Applications", removable: true }], io, async () => ({
      bundleId: "com.example.editor", version: "2.0", iconDataUrl: null, lastOpened: null
    }));
    expect(result.apps[0].sizeBytes).toBeNull();
    expect(result.inaccessible).toContain("/fixtures/Applications/Editor.app");
  });
});
