# NectoProxy Desktop

A native desktop shell for [NectoProxy](https://github.com/sitharaj88/nectoproxy),
built with [Tauri v2](https://v2.tauri.app). Instead of running `nectoproxy start`
and opening the web UI in a browser, this app gives you a dedicated native window.

## Architecture — the "sidecar" pattern

This app contains **no** proxy logic of its own. It is a thin wrapper that:

1. **Spawns the CLI.** On startup the Rust side runs `nectoproxy start --no-open`
   as a child process using `tauri-plugin-shell`.
2. **Discovers the UI URL.** The CLI prints its address to stdout, e.g.
   `Web UI: http://localhost:8889/?token=<hex>`. We stream the child's stdout and
   extract that URL — it is the only line that carries a `?token=` query string,
   which is exactly the session token the UI needs. (ANSI colour codes, if any,
   are stripped before matching.)
3. **Navigates the window.** The main window starts on a small `index.html`
   splash screen (`src/index.html`) and is redirected to the live UI URL as soon
   as it is discovered, via `WebviewWindow::navigate`.
4. **Cleans up.** When the window is closed or the app quits, the spawned
   `nectoproxy` child process is killed so no orphaned proxy is left listening on
   the port.

The relevant code is in [`src-tauri/src/lib.rs`](./src-tauri/src/lib.rs).

### The `nectoproxy` binary

The app runs a program named `nectoproxy` from your `PATH`. You need **Node.js**
and the `nectoproxy` npm package available, e.g.:

```bash
npm install -g nectoproxy
```

To point at a specific binary (for local development against a workspace build),
set the `NECTOPROXY_BIN` environment variable to an absolute path, e.g.:

```bash
NECTOPROXY_BIN="$PWD/apps/cli/dist/index.js" pnpm --filter @nectoproxy/desktop tauri dev
```

> Note: if you point `NECTOPROXY_BIN` at a `.js` file you must make it directly
> executable (shebang + `chmod +x`) or wrap it in a small shell script, since the
> app execs the program directly rather than via `node`.

> **Bundling option (not yet enabled):** you can also ship the CLI *inside* the
> app as a Tauri "sidecar" binary (a pkg/`node --sea` build of the CLI placed in
> `src-tauri/binaries/` and referenced via `bundle.externalBin` +
> `app.shell().sidecar(...)`). That removes the global-install requirement at the
> cost of a larger bundle. The current scaffold uses the simpler `PATH` lookup.

## Prerequisites

- **Rust** (stable) and the Tauri system dependencies — see the
  [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/).
  There is intentionally no Rust toolchain committed to this repo; you must
  install it yourself (`https://rustup.rs`).
- **Node.js 20+** and **pnpm 9** (already required by the monorepo).
- The `nectoproxy` CLI available on `PATH` (see above).

## Icons

The committed `src-tauri/icons/icon.png` is a **placeholder**. Replace it with the
real logo, then generate all platform icon files (they are gitignored and not
committed):

```bash
pnpm --filter @nectoproxy/desktop tauri icon src-tauri/icons/icon.png
```

`tauri build` will fail until these files exist, because `tauri.conf.json`
references them. CI generates them automatically.

## Development

From the monorepo root:

```bash
# 1. Install JS deps (adds @tauri-apps/cli). The lockfile does not yet contain
#    this package, so allow it to update:
pnpm install --no-frozen-lockfile

# 2. Generate icons (first time only, or after changing icon.png):
pnpm --filter @nectoproxy/desktop tauri icon apps/desktop/src-tauri/icons/icon.png

# 3. Run the app (compiles the Rust shell, opens the window):
pnpm --filter @nectoproxy/desktop tauri dev
```

Build production bundles (`.dmg` / `.app`, `.msi` / `.exe`, `.AppImage` / `.deb`):

```bash
pnpm --filter @nectoproxy/desktop tauri build
```

### Relationship to `pnpm build` / turbo

The package's `build` script is a deliberate **no-op** (it just prints a message).
This keeps `pnpm build` (`turbo run build`) at the repo root working on machines
without a Rust toolchain — turbo will "build" this package instantly without
invoking Cargo. The real desktop build is only ever produced via the explicit
`tauri build` command above (and in CI).

## Releases / CI

`.github/workflows/desktop-release.yml` builds signed-less bundles for macOS
(Apple Silicon + Intel), Windows, and Linux on tags matching `desktop-v*`
(e.g. `desktop-v0.1.2`), and uploads them to a draft GitHub Release. It installs
Rust, Node, pnpm, and the Linux WebKitGTK system dependencies, generates the
icons, and runs `tauri build` via `tauri-apps/tauri-action`.

To cut a release:

```bash
git tag desktop-v0.1.2
git push origin desktop-v0.1.2
```

## Auto-update (optional, disabled)

Tauri ships an [updater plugin](https://v2.tauri.app/plugin/updater/). It is
**not** enabled in this scaffold. To turn it on:

1. Add the dependency in `src-tauri/Cargo.toml`:
   `tauri-plugin-updater = "2"`.
2. Register it in `src-tauri/src/lib.rs`:
   `.plugin(tauri_plugin_updater::Builder::new().build())`.
3. Add the JS dependency `@tauri-apps/plugin-updater` and call it from the
   frontend, or trigger the check from Rust.
4. Add an `updater` block to `tauri.conf.json` under `plugins`, with your
   `endpoints` (where `latest.json` is hosted) and the public key `pubkey`.
5. Generate a signing keypair with `pnpm tauri signer generate`, keep the private
   key + password as CI secrets (`TAURI_SIGNING_PRIVATE_KEY`,
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`), and publish the generated `latest.json`
   alongside the release bundles.
6. Grant the `updater:default` permission in `src-tauri/capabilities/default.json`.

See the plugin docs for the exact `latest.json` schema and endpoint format.
