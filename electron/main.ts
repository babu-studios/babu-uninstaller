import { app, BrowserWindow, session } from "electron";
import { join } from "node:path";
import { registerIpc } from "./ipc";

let window: BrowserWindow | null = null;
let pendingAppPath: string | null = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, args) => {
    pendingAppPath = args.find((arg) => arg.endsWith(".app")) ?? pendingAppPath;
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
      deliverOpenPath();
    }
  });
  app.on("open-file", (event, path) => {
    event.preventDefault();
    pendingAppPath = path;
    deliverOpenPath();
  });
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    registerIpc(() => window);
    window = new BrowserWindow({
      width: 1120,
      height: 720,
      minWidth: 760,
      minHeight: 580,
      title: "Babu App Uninstaller",
      backgroundColor: "#101114",
      webPreferences: {
        preload: join(app.getAppPath(), "dist-electron", "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
    window.on("closed", () => app.quit());
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event, url) => {
      const developmentUrl = process.env.VITE_DEV_SERVER_URL;
      if (developmentUrl && url.startsWith(developmentUrl)) return;
      if (!url.startsWith("file://")) event.preventDefault();
    });
    window.webContents.once("did-finish-load", deliverOpenPath);
    const loading = process.env.VITE_DEV_SERVER_URL ?
      window.loadURL(process.env.VITE_DEV_SERVER_URL) :
      window.loadFile(join(app.getAppPath(), "dist", "index.html"));
    void loading.catch((error: unknown) => console.error("Could not load the application window:", error));
  });
  app.on("window-all-closed", () => app.quit());
}

function deliverOpenPath() {
  if (!window || !pendingAppPath || window.webContents.isLoading()) return;
  window.webContents.send("app:open-file", pendingAppPath);
  pendingAppPath = null;
}
