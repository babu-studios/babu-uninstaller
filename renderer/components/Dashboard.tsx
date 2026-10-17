import { useEffect, useRef } from "react";
import { ArrowDownUp, Clock3, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { AppInfo } from "../../shared/contracts";
import { AppList } from "./AppList";
import { Dropdown } from "./common/Dropdown";
import { IconButton } from "./common/IconButton";
import { Spinner } from "./common/Spinner";
import { FullDiskAccessNotice } from "./FullDiskAccessNotice";

type Filter = "all" | "large" | "unused";
type Sort = "name" | "size" | "lastUsed";

interface DashboardProps {
  loading: boolean;
  error: string | null;
  appCount: number;
  apps: AppInfo[];
  query: string;
  setQuery(value: string): void;
  filter: Filter;
  setFilter(value: Filter): void;
  sort: Sort;
  setSort(value: Sort): void;
  needsAccess: boolean;
  onRefresh(): void;
  onOpenSettings(): void;
  onRescan(): void;
  onUndo(): void;
  onChoose(app: AppInfo): void;
}

export function Dashboard(props: DashboardProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  return <>
    <header className="topbar">
      <div className="brand"><span className="logo"><Sparkles size={19} /></span>
        <div><strong>Babu</strong><span>APP UNINSTALLER</span></div></div>
      <label className="search"><Search size={16} /><input ref={searchRef} value={props.query}
        onChange={(event) => props.setQuery(event.target.value)} placeholder="Search your apps" aria-label="Search apps" /></label>
      <IconButton label="View this session's Trash log" onClick={props.onUndo}><Clock3 size={16} /></IconButton>
    </header>
    <section className="content">
      {props.needsAccess && <FullDiskAccessNotice onOpenSettings={props.onOpenSettings} onRescan={props.onRescan} />}
      <div className="heading"><div><p className="eyebrow">YOUR MAC, A LITTLE LIGHTER</p><h1>Applications</h1></div>
        <div className="count"><span className="dot" />{props.loading ? "Scanning your Mac" : `${props.appCount} apps found`}</div></div>
      <div className="toolbar">
        {(["all", "large", "unused"] as const).map((filter) => <button key={filter}
          className={`filter ${props.filter === filter ? "active" : ""}`} onClick={() => props.setFilter(filter)}>
          {filter === "all" ? "All apps" : filter === "large" ? "Large · 1 GB+" : "Unused · 6+ months"}
        </button>)}
        <span className="sort"><ArrowDownUp size={12} /><Dropdown<Sort> label="Sort by" value={props.sort}
          options={[{ value: "name", label: "Name" }, { value: "size", label: "Size" }, { value: "lastUsed", label: "Last used" }]}
          onChange={props.setSort} /></span>
      </div>
      <div className="panel">
        {props.loading ? <div className="state"><Spinner />
          <p>Finding your applications</p><span>This usually takes just a moment</span></div> :
          props.error ? <div className="state"><h2>Couldn't scan Applications</h2><p>{props.error}</p>
            <button className="primary" onClick={props.onRefresh}>Try again</button></div> :
            <AppList apps={props.apps} onChoose={props.onChoose} />}
      </div>
      <footer><span>Removals are reviewed before anything moves to Trash.</span>
        <span>SAFE BY DESIGN <i /><ShieldCheck size={11} /></span></footer>
    </section>
  </>;
}
