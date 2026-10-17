import { Folder, Info, RotateCcw } from "lucide-react";
import type { LeftoverItem } from "../../shared/contracts";
import { formatBytes } from "../utils/format";
import "../styles/preview.css";

interface RemovalPreviewProps {
  items: LeftoverItem[];
  appPath: string;
  onToggle(path: string): void;
  onReveal(path: string): void;
  dryRun: boolean;
  onDryRunChange(value: boolean): void;
  permanent: boolean;
  onPermanentChange(value: boolean): void;
}

export function RemovalPreview(props: RemovalPreviewProps) {
  const leftovers = props.items.filter((item) => item.path !== props.appPath);
  const groups = props.items.reduce((map, item) => {
    const group = map.get(item.location) ?? [];
    group.push(item);
    map.set(item.location, group);
    return map;
  }, new Map<string, LeftoverItem[]>());
  return <div className="preview-content">
    <div className="preview-note"><Info size={15} /><span>Review each item. Only exact bundle-ID matches are selected automatically.</span></div>
    <div className="preview-list">
      {[...groups].map(([location, items]) => <section className="preview-group" key={location}>
        <h3><Folder size={14} />{location}</h3>
        {items.map((item, index) => <div className={`preview-item ${item.manualOnly ? "manual" : ""}`} key={item.path}>
          <input id={`preview-item-${index}`} type="checkbox" checked={item.selected} disabled={item.manualOnly}
            onChange={() => props.onToggle(item.path)} />
          <label className="preview-name" htmlFor={`preview-item-${index}`}><strong>{item.path.split("/").at(-1)}</strong>
            <small>{item.confidence} confidence{item.manualOnly ? " · Finder only" : ""}</small></label>
          <span className="preview-size">{formatBytes(item.sizeBytes)}</span>
          {item.manualOnly && <button type="button" className="reveal" onClick={() => props.onReveal(item.path)}>Show in Finder</button>}
        </div>)}
      </section>)}
      {!leftovers.length && <div className="no-leftovers"><RotateCcw size={20} /><strong>No related leftover files found</strong>
        <span>The application itself is still included in this preview.</span></div>}
    </div>
    <div className="preview-options">
      <label><input type="checkbox" checked={props.dryRun} onChange={(event) => props.onDryRunChange(event.target.checked)} />
        Dry run <small>List actions without changing anything</small></label>
      <label><input type="checkbox" checked={props.permanent} onChange={(event) => props.onPermanentChange(event.target.checked)} />
        Delete permanently <small>Irreversible; requires a second confirmation</small></label>
    </div>
  </div>;
}
