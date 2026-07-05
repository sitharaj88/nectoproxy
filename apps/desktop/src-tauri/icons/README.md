# App icons

`icon.png` in this folder is a **placeholder** 1024×1024 RGBA image. Replace it
with the real NectoProxy logo before shipping.

The platform-specific icon files referenced by `tauri.conf.json`
(`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`, and the
Windows Store logos) are **not** committed — they are generated from `icon.png`.

Generate them with:

```bash
pnpm --filter @nectoproxy/desktop tauri icon src-tauri/icons/icon.png
```

Run this once locally (and it is run automatically in CI) before
`tauri build`, otherwise the bundler will fail because the icon files listed in
`tauri.conf.json` do not exist yet.
