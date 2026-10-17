# Development and releases

## Architecture

`electron/main.ts` owns the single window, app lifecycle, and denied-by-default permission handlers. `electron/preload.ts` exposes a typed `contextBridge`; renderer code has no Node integration. React/Vite lives in `renderer/`. All filesystem scans, validation, running-app checks, Trash operations, and permanent deletion run in Electron main.

## Safety design

The scanner reads only `/Applications`, `~/Applications`, `/System/Applications` (read-only), and the configured Library categories. Targets are re-resolved and checked against narrow allow-listed roots; symlinks, parent traversal, the product app, and system paths are refused. Leftovers match exact bundle IDs or exact app names; only exact bundle-ID matches are selected by default. The preview lists exact targets and sizes. Normal removal uses Electron `shell.trashItem`; permanent deletion is opt-in and asks again in a native macOS dialog. `/Library` matches are Finder-only because `shell.trashItem` cannot request per-item administrator authorization. Dry runs do not mutate files. Session Trash history is available in the UI.

Full Disk Access is not required for ordinary user-library scanning. When macOS denies access, the app reports unavailable paths and links to Privacy & Security; it never elevates the whole app or stores credentials.

## Build and release

`npm run dist` builds arm64 and x64 DMGs. The release workflow builds arm64 on `macos-14`, x64 on `macos-15-intel`, then attaches both DMGs and `SHA256SUMS.txt` to a hand-written release. Tags use `v*`. Releases are unsigned and not notarized; the README and download site include first-launch steps.

To add notarization later, create a Developer ID Application certificate, export it as a password-protected `.p12`, and add the certificate/password plus Apple notarization credentials as repository Actions secrets. Configure electron-builder signing/notarization only after validating the credential setup on a protected test release. Never commit certificates or credentials.

## npm 12 install scripts

npm may block Electron and esbuild lifecycle scripts. Run `npm run approve-scripts`, then `npm run rebuild:electron`. CI intentionally uses `npm ci --ignore-scripts && npm rebuild esbuild && node node_modules/electron/install.js`.
