import path from "node:path";
import type { Confidence } from "../shared/contracts";

const COMMON_NAMES = new Set(["app", "mail", "maps", "news", "notes", "zoom", "home"]);

export function matchLeftover(
  candidatePath: string,
  appName: string,
  bundleId: string
): { matched: boolean; confidence: Confidence; selected: boolean } {
  const name = path.basename(candidatePath).replace(/\.plist$/i, "").toLocaleLowerCase();
  const id = bundleId.trim().toLocaleLowerCase();
  const app = appName.trim().toLocaleLowerCase();
  if (id && name === id) return { matched: true, confidence: "high", selected: true };
  if (!app || name !== app) return { matched: false, confidence: "low", selected: false };
  if (app.length < 5 || COMMON_NAMES.has(app)) return { matched: true, confidence: "low", selected: false };
  return { matched: true, confidence: "medium", selected: false };
}
