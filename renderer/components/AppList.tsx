import { LockKeyhole, PackageOpen } from "lucide-react";
import type { AppInfo } from "../../shared/contracts";
import { formatBytes, formatDate } from "../utils/format";
import "../styles/apps.css";

interface AppListProps {
  apps: AppInfo[];
  onChoose(app: AppInfo): void;
}

export function AppList({ apps, onChoose }: AppListProps) {
  if (!apps.length) return <div className="state">
    <span className="empty-icon"><PackageOpen size={24} /></span>
    <h2>No applications found</h2><p>Try a different search, or check the Applications folders.</p>
  </div>;
  return <div className="app-list" role="list">
    {apps.map((app) => <button className="app-row" key={app.path} role="listitem"
      onClick={() => onChoose(app)} disabled={!app.removable} title={app.removable ? `Review ${app.name}` : "System applications are read-only"}>
      <span className="app-icon">{app.iconDataUrl ? <img src={app.iconDataUrl} alt="" /> : <PackageOpen size={19} />}</span>
      <span className="app-primary"><strong>{app.name}</strong><small>{app.version ? `Version ${app.version}` : "Version unavailable"}</small></span>
      <span className="app-meta"><b>{formatBytes(app.sizeBytes)}</b><small>Last opened {formatDate(app.lastOpened)}</small></span>
      {app.removable ? <span className="app-chevron">›</span> : <LockKeyhole className="app-lock" size={14} />}
    </button>)}
  </div>;
}
