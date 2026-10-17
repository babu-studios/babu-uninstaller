# Contributing

Thanks for helping make app removal safer and clearer.

## Ways to contribute

- Report a reproducible bug or suggest a focused feature using the issue templates.
- Improve tests, documentation, accessibility, or the download site.
- Submit a pull request against `main`; discuss broad behavior changes in an issue first.

## Development setup

Use Node.js 24+ on macOS. Install dependencies with `npm ci --ignore-scripts`. With npm 12, approve required scripts with `npm run approve-scripts`, then run `npm run rebuild:electron`. The rebuild runs `npm rebuild esbuild` and `node node_modules/electron/install.js`.

Commands: `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run dist`. CI installs with `npm ci --ignore-scripts && npm rebuild esbuild && node node_modules/electron/install.js`.

## Code guidelines

- Keep files near or under 150 lines; use strict TypeScript and the existing Electron/React/Vite patterns.
- Keep filesystem access in Electron main. Expose only typed, validated IPC through the isolated preload.
- Never remove `/System`, the running product, an allow-list root, or an unvalidated/symlinked path. Revalidate exact paths at action time.
- Show exact targets before acting. Trash is the default; permanent deletion must require an additional confirmation.
- Match leftovers only by exact bundle ID or exact app name. Keep uncertain matches unchecked.
- Add fixture-based tests for path, matching, or scanning changes. Never point scanner tests at a real Applications or Library directory.
- Report filesystem/permission errors; do not silently widen access or fall back to privileged execution.
- Do not add camera or microphone permissions, secrets, or unreviewed bundled code.

## Pull request checklist

- [ ] The change is scoped and documented where user behavior changes.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass.
- [ ] Safety-sensitive changes include targeted tests and preserve preview/confirmation.
- [ ] UI changes are keyboard-accessible and work in the packaged app.
- [ ] No generated build output, credentials, or unrelated files are included.

## Security and licensing

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/babu-studios/babu-uninstaller/security/advisories/new), not a public issue. Contributions are submitted under the repository's MIT license.
