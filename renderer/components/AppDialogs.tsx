import type { Dispatch, SetStateAction } from "react";
import { ConfirmDialog } from "./common/ConfirmDialog";
import { RemovalPreview } from "./RemovalPreview";
import { formatBytes } from "../utils/format";
import type { useRemovalWorkflow } from "../hooks/useRemovalWorkflow";

type Workflow = ReturnType<typeof useRemovalWorkflow>;

interface AppDialogsProps {
  workflow: Workflow;
  undoPaths: string[] | null;
  setUndoPaths: Dispatch<SetStateAction<string[] | null>>;
  onReveal(path: string): void;
}

export function AppDialogs({ workflow, undoPaths, setUndoPaths, onReveal }: AppDialogsProps) {
  const { preview, setPreview, activeApp, runningApp, setRunningApp, confirmRemove, setConfirmRemove,
    busy, dryRun, setDryRun, permanent, setPermanent, selected, toggle, requestRemoval,
    removeSelected, quitAndContinue } = workflow;
  return <>
    {preview && activeApp && <ConfirmDialog title={`Review ${activeApp.name}`}
      description="Only the checked items shown here can be removed. The app itself is selected by default."
      confirmLabel={dryRun ? "Run dry run" : permanent ? "Continue to confirmation" : "Move selected to Trash"}
      danger={permanent && !dryRun} onCancel={() => setPreview(null)} onConfirm={requestRemoval}>
      <RemovalPreview items={preview.items} appPath={activeApp.path} onToggle={toggle} onReveal={onReveal}
        dryRun={dryRun} onDryRunChange={setDryRun} permanent={permanent} onPermanentChange={setPermanent} />
      <p className="selection-summary">{selected.length} selected · {formatBytes(selected.reduce((sum, item) => sum + (item.sizeBytes ?? 0), 0))}</p>
    </ConfirmDialog>}
    {confirmRemove && activeApp && <ConfirmDialog
      title={permanent && !dryRun ? "Confirm permanent deletion" : "Move selected items?"}
      description={dryRun ? "This dry run will make no changes." : permanent ?
        "A second macOS confirmation will appear. This action cannot be undone." :
        "Selected items will be moved to Trash and can be restored from Finder."}
      confirmLabel={dryRun ? "Run dry run" : permanent ? "Continue" : "Move to Trash"}
      danger={permanent && !dryRun} busy={busy} onCancel={() => setConfirmRemove(false)}
      onConfirm={() => void removeSelected()}>
      <ul className="undo-list">{selected.map((item) => <li key={item.path}>{item.path}</li>)}</ul>
    </ConfirmDialog>}
    {runningApp && <ConfirmDialog title={`${runningApp.name} is open`}
      description="Quit it first so files in use aren't left behind. The app will receive a normal quit signal."
      confirmLabel="Quit app and continue" busy={busy} onCancel={() => setRunningApp(null)}
      onConfirm={() => void quitAndContinue()} />}
    {undoPaths && <ConfirmDialog title="Moved to Trash this session"
      description={undoPaths.length ? "Restore these items from Finder if needed." : "Nothing has been moved to Trash during this session."}
      confirmLabel="Done" onCancel={() => setUndoPaths(null)} onConfirm={() => setUndoPaths(null)}>
      <ul className="undo-list">{undoPaths.map((path) => <li key={path}>{path}</li>)}</ul>
    </ConfirmDialog>}
  </>;
}
