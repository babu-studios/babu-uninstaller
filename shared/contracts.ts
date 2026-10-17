export type Confidence = "high" | "medium" | "low";

export interface AppInfo {
  id: string;
  path: string;
  name: string;
  bundleId: string;
  version: string;
  sizeBytes: number | null;
  lastOpened: string | null;
  removable: boolean;
  iconDataUrl: string | null;
}

export interface LeftoverItem {
  path: string;
  location: string;
  sizeBytes: number | null;
  confidence: Confidence;
  selected: boolean;
  manualOnly: boolean;
}

export interface ScanResult {
  items: LeftoverItem[];
  inaccessible: string[];
}

export interface AppScanResult {
  apps: AppInfo[];
  inaccessible: string[];
}

export interface RemovalResult {
  path: string;
  status: "trashed" | "deleted" | "dry-run" | "failed";
  sizeBytes: number | null;
  message?: string;
}

export interface BabuBridge {
  listApps(): Promise<AppScanResult>;
  scanLeftovers(appPath: string): Promise<ScanResult>;
  removeItems(appPath: string, paths: string[], dryRun: boolean, permanent: boolean): Promise<RemovalResult[]>;
  isRunning(appPath: string): Promise<boolean>;
  quitApp(appPath: string): Promise<void>;
  revealPath(path: string): Promise<void>;
  openPrivacySettings(): Promise<void>;
  getUndoLog(): Promise<string[]>;
  onOpenApp(callback: (path: string) => void): () => void;
  onOpenError(callback: (message: string) => void): () => void;
}
