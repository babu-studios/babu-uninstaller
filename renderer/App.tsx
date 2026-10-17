import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { AppInfo } from "../shared/contracts";
import { AppDialogs } from "./components/AppDialogs";
import { Dashboard } from "./components/Dashboard";
import { Toast } from "./components/common/Toast";
import { useInventory } from "./hooks/useInventory";
import { useRemovalWorkflow } from "./hooks/useRemovalWorkflow";
import { isUnused } from "./utils/format";
import "./styles/app.css";
import "./styles/apps.css";
import "./styles/components.css";

type Filter = "all" | "large" | "unused";
type Sort = "name" | "size" | "lastUsed";
type Notice = { kind: "success" | "error" | "info"; message: string };

export function App() {
  const inventory = useInventory();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("name");
  const [toast, setToast] = useState<Notice | null>(null);
  const [undoPaths, setUndoPaths] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const workflow = useRemovalWorkflow(inventory.apps, inventory.refresh, (kind, message) => setToast({ kind, message }));
  const openPath = useRef(workflow.openPath);
  openPath.current = workflow.openPath;

  useEffect(() => {
    const stopOpen = window.babu.onOpenApp((path) => { void openPath.current(path); });
    const stopError = window.babu.onOpenError((message) => setToast({ kind: "error", message }));
    return () => { stopOpen(); stopError(); };
  }, []);

  const visibleApps = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return inventory.apps.filter((app) => {
      const matches = `${app.name} ${app.bundleId}`.toLocaleLowerCase().includes(normalized);
      const matchesFilter = filter === "all" || (filter === "large" ?
        app.sizeBytes !== null && app.sizeBytes >= 1024 ** 3 : isUnused(app.lastOpened));
      return matches && matchesFilter;
    }).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) :
      sort === "size" ? (b.sizeBytes ?? -1) - (a.sizeBytes ?? -1) :
        (b.lastOpened ? Date.parse(b.lastOpened) : 0) - (a.lastOpened ? Date.parse(a.lastOpened) : 0));
  }, [inventory.apps, query, filter, sort]);

  async function showUndoLog() {
    try { setUndoPaths(await window.babu.getUndoLog()); }
    catch (error) { setToast({ kind: "error", message: errorMessage(error) }); }
  }

  async function openSettings() {
    try { await window.babu.openPrivacySettings(); }
    catch (error) { setToast({ kind: "error", message: errorMessage(error) }); }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const path = window.babu.getPathForFile(file);
    if (!path.toLowerCase().endsWith(".app")) {
      setToast({ kind: "error", message: "Drop an installed .app bundle to review it." });
      return;
    }
    window.babu.openDroppedApp(path);
  }

  const needsAccess = inventory.inaccessible.length > 0 || (workflow.preview?.inaccessible.length ?? 0) > 0;
  return <main className="shell" onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
    onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={handleDrop}>
    {dragging && <div className="drop-overlay">Drop an installed app to review it</div>}
    <Dashboard loading={inventory.loading} error={inventory.error} appCount={inventory.apps.length} apps={visibleApps}
      query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} sort={sort} setSort={setSort}
      needsAccess={needsAccess} onRefresh={() => { void inventory.refresh(); }} onOpenSettings={() => void openSettings()}
      onRescan={() => { void inventory.refresh(); }}
      onUndo={() => void showUndoLog()} onChoose={(app: AppInfo) => void workflow.openPreview(app)} />
    <AppDialogs workflow={workflow} undoPaths={undoPaths} setUndoPaths={setUndoPaths}
      onReveal={(path) => { void window.babu.revealPath(path).catch((error: unknown) =>
        setToast({ kind: "error", message: errorMessage(error) })); }} />
    {toast && <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />}
  </main>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}
