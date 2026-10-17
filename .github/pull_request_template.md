## Summary

<!-- Describe the user-visible change and motivation. -->

## Validation

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Packaged app checked when behavior affects Electron or macOS integration

## Safety checklist

- [ ] Filesystem paths remain narrowly allow-listed and revalidated in main.
- [ ] The exact removal list is previewed and confirmed.
- [ ] No system app, symlink, or unselected file can be removed.
