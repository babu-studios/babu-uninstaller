import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { BabuBridge } from "../shared/contracts";

const pathListeners = new Set<(path: string) => void>();
const errorListeners = new Set<(message: string) => void>();
const pendingPaths: string[] = [];
const pendingErrors: string[] = [];

ipcRenderer.on("app:open-file", (_event, path: string) => {
  if (pathListeners.size) pathListeners.forEach((callback) => callback(path));
  else pendingPaths.push(path);
});
ipcRenderer.on("app:open-error", (_event, message: string) => {
  if (errorListeners.size) errorListeners.forEach((callback) => callback(message));
  else pendingErrors.push(message);
});

const bridge: BabuBridge = {
  listApps: () => ipcRenderer.invoke("app:list"),
  scanLeftovers: (appPath) => ipcRenderer.invoke("app:scan", appPath),
  removeItems: (appPath, paths, dryRun, permanent) =>
    ipcRenderer.invoke("app:remove", appPath, paths, dryRun, permanent),
  isRunning: (appPath) => ipcRenderer.invoke("app:running", appPath),
  quitApp: (appPath) => ipcRenderer.invoke("app:quit", appPath),
  revealPath: (target) => ipcRenderer.invoke("app:reveal", target),
  openPrivacySettings: () => ipcRenderer.invoke("app:privacy-settings"),
  getUndoLog: () => ipcRenderer.invoke("app:undo-log"),
  onOpenApp: (callback) => {
    pathListeners.add(callback);
    pendingPaths.splice(0).forEach(callback);
    return () => pathListeners.delete(callback);
  },
  onOpenError: (callback) => {
    errorListeners.add(callback);
    pendingErrors.splice(0).forEach(callback);
    return () => errorListeners.delete(callback);
  }
};

contextBridge.exposeInMainWorld("babu", Object.freeze({
  ...bridge,
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  openDroppedApp: (path: string) => ipcRenderer.send("app:open-dropped", path)
}));
