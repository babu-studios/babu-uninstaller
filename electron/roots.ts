import os from "node:os";
import path from "node:path";

const home = os.homedir();

export const appRoots = [
  { path: "/Applications", removable: true },
  { path: path.join(home, "Applications"), removable: true },
  { path: "/System/Applications", removable: false }
];

const categories = [
  "Application Support", "Caches", "Preferences", "Containers", "Group Containers",
  "Logs", "Saved Application State", "LaunchAgents", "WebKit", "HTTPStorages"
];

export const leftoverRoots = categories.flatMap((category) => [
  { path: path.join(home, "Library", category), location: `~/Library/${category}`, manualOnly: false },
  { path: path.join("/Library", category), location: `/Library/${category}`, manualOnly: true }
]);

export const userAppRoot = path.join(home, "Applications");
export const systemAppRoot = "/Applications";
export const protectedPaths = ["/System", "/Library", path.join(home, "Library")];

export function appAllowedRoots(appPath: string): string[] {
  return appPath.startsWith(`${userAppRoot}${path.sep}`) ? [userAppRoot] : [systemAppRoot];
}
