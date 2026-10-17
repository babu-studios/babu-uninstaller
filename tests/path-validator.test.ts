import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateTarget, type PathFileSystem } from "../electron/path-validator";

const root = path.resolve("/safe/apps");
const target = path.join(root, "Editor.app");
const protectedPaths = ["/System", "/Applications/Babu App Uninstaller.app"];

function filesystem(symlinks: string[] = [], aliases: Record<string, string> = {}): PathFileSystem {
  return {
    lstat: async (item) => ({ isSymbolicLink: () => symlinks.includes(item) }),
    realpath: async (item) => aliases[item] ?? item
  };
}

describe("validateTarget", () => {
  it("accepts a real descendant but never the allow-listed root itself", async () => {
    await expect(validateTarget(target, [root], protectedPaths, filesystem())).resolves.toBe(target);
    await expect(validateTarget(root, [root], protectedPaths, filesystem())).rejects.toThrow();
  });

  it.each(["", "/", "/Library", "/safe/apps/../secret", "/safe/apps/Editor.app/../../outside"])(
    "rejects unsafe path %s", async (unsafe) => {
      await expect(validateTarget(unsafe, [root], protectedPaths, filesystem())).rejects.toThrow();
    }
  );

  it("rejects protected apps and symlink traversal", async () => {
    await expect(validateTarget("/Applications/Babu App Uninstaller.app", ["/Applications"], protectedPaths, filesystem()))
      .rejects.toThrow("Protected");
    await expect(validateTarget(target, [root], protectedPaths, filesystem([target]))).rejects.toThrow("Symlink");
    const parent = path.join(root, "nested");
    await expect(validateTarget(path.join(parent, "file"), [root], protectedPaths, filesystem([parent])))
      .rejects.toThrow("Symlink");
  });

  it("rejects a target whose real path escapes the allow-list", async () => {
    await expect(validateTarget(target, [root], protectedPaths, filesystem([], { [target]: "/private/secret" })))
      .rejects.toThrow("resolves outside");
  });

  it("rejects an allow-listed root that resolves through a symlink", async () => {
    await expect(validateTarget(target, [root], protectedPaths, filesystem([], { [root]: "/private/apps" })))
      .rejects.toThrow("Allowed location resolves through a symlink");
  });

  it("allows only a configured user Library subfolder, not the Library parent", async () => {
    const cacheRoot = "/Users/fixture/Library/Caches";
    await expect(validateTarget(`${cacheRoot}/com.example.app`, [cacheRoot], ["/System", "/Library"], filesystem()))
      .resolves.toBe(`${cacheRoot}/com.example.app`);
    await expect(validateTarget("/Users/fixture/Library", ["/Users/fixture/Library"], [], filesystem()))
      .rejects.toThrow("outside an allowed location");
  });
});
