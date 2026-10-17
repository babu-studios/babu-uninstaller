# Babu App Uninstaller

A small, open-source macOS app uninstaller. Review every app and related file before moving selected items to Trash.

**Download:** [Babu App Uninstaller for macOS](https://babu-studios.github.io/babu-uninstaller/)

## Install

Open the downloaded DMG, drag **Babu App Uninstaller** to Applications, then eject the DMG. The app is currently unsigned and not notarized:

- **macOS 15 and later:** Click **Done** in the warning, then open **System Settings → Privacy & Security → Open Anyway**.
- **macOS 14 and earlier:** In Finder, right-click the app and choose **Open**.
- **Terminal:** `xattr -cr "/Applications/Babu App Uninstaller.app"`

## Run from source

Requires Node.js 24+ and macOS. Run `npm ci --ignore-scripts`, then `npm run rebuild:electron`, `npm run dev`, or `npm run build`. Use `npm test`, `npm run typecheck`, and `npm run dist` for validation and DMGs. npm 12 users should run `npm run approve-scripts` before the rebuild.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, safety rules, and the pull-request checklist. Development and release design is in [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## License

MIT. See [LICENSE](./LICENSE).
