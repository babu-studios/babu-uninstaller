import { useMemo, useState } from "react";
import type { AppInfo, RemovalResult, ScanResult } from "../../shared/contracts";
import { formatBytes } from "../utils/format";

type ToastKind = "success" | "error" | "info";
type Notify = (kind: ToastKind, message: string) => void;

export function useRemovalWorkflow(
  apps: AppInfo[],
  refresh: () => Promise<void>,
  notify: Notify
) {
  const [preview, setPreview] = useState<ScanResult | null>(null);
  const [activeApp, setActiveApp] = useState<AppInfo | null>(null);
  const [runningApp, setRunningApp] = useState<AppInfo | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [permanent, setPermanent] = useState(false);
  const selected = useMemo(() => preview?.items.filter((item) => item.selected && !item.manualOnly) ?? [], [preview]);

  async function loadPreview(app: AppInfo) {
    const result = await window.babu.scanLeftovers(app.path);
    setActiveApp(app);
    setPreview(result);
    setDryRun(false);
    setPermanent(false);
  }

  async function openPreview(app: AppInfo) {
    if (!app.removable) return;
    setBusy(true);
    try {
      if (await window.babu.isRunning(app.path)) { setRunningApp(app); return; }
      await loadPreview(app);
    } catch (error) { notify("error", friendlyError(error)); }
    finally { setBusy(false); }
  }

  async function openPath(path: string) {
    const app = apps.find((item) => item.path === path);
    if (!app) { notify("error", "This app is not in a supported Applications folder."); return; }
    await openPreview(app);
  }

  async function quitAndContinue() {
    if (!runningApp) return;
    setBusy(true);
    try {
      await window.babu.quitApp(runningApp.path);
      for (let attempt = 0; attempt < 12 && await window.babu.isRunning(runningApp.path); attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      if (await window.babu.isRunning(runningApp.path)) throw new Error("The app is still running. Quit it and try again.");
      const app = runningApp;
      setRunningApp(null);
      await loadPreview(app);
    } catch (error) { notify("error", friendlyError(error)); }
    finally { setBusy(false); }
  }

  function toggle(path: string) {
    setPreview((current) => current ? {
      ...current, items: current.items.map((item) => item.path === path && !item.manualOnly ?
        { ...item, selected: !item.selected } : item)
    } : current);
  }

  function requestRemoval() {
    if (!selected.length) { notify("info", "Select at least one item to continue."); return; }
    setConfirmRemove(true);
  }

  async function removeSelected() {
    if (!activeApp || !preview) return;
    setBusy(true);
    try {
      const paths = selected.map((item) => item.path);
      const results = await window.babu.removeItems(activeApp.path, paths, dryRun, permanent);
      setConfirmRemove(false);
      if (!results.length && permanent && !dryRun) {
        notify("info", "Cancelled. Nothing was changed.");
        return;
      }
      reportResults(results, dryRun, permanent, notify);
      setPreview(null);
      if (!dryRun) await refresh();
    } catch (error) { notify("error", friendlyError(error)); }
    finally { setBusy(false); }
  }

  return {
    preview, setPreview, activeApp, runningApp, setRunningApp, confirmRemove, setConfirmRemove,
    busy, dryRun, setDryRun, permanent, setPermanent, selected, openPreview, openPath, quitAndContinue,
    toggle, requestRemoval, removeSelected
  };
}

function reportResults(results: RemovalResult[], dryRun: boolean, permanent: boolean, notify: Notify) {
  const completed = results.filter((item) => item.status !== "failed");
  const failed = results.filter((item) => item.status === "failed");
  const bytes = completed.reduce((total, item) => total + (item.sizeBytes ?? 0), 0);
  const prefix = dryRun ? "Dry run" : permanent ? "Permanently removed" : "Moved to Trash";
  const message = `${prefix}: ${completed.length} item${completed.length === 1 ? "" : "s"}, ${formatBytes(bytes)}.` +
    (failed.length ? ` ${failed.length} failed: ${friendlyError(failed[0].message)}` : "");
  notify(failed.length ? "error" : dryRun ? "info" : "success", message);
}

function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  if (/EACCES|EPERM|permission denied|operation not permitted/i.test(message)) {
    return "macOS denied access to one or more items. Check Full Disk Access or review the item in Finder.";
  }
  return message;
}
