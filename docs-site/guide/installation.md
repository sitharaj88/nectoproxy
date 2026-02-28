# Installation

This page covers all the ways to install and run NectoProxy on your system.

## System Requirements

| Requirement | Details |
|---|---|
| **Node.js** | Version 20.0.0 or later |
| **Operating System** | macOS, Windows, or Linux |
| **Disk Space** | ~50 MB for the package and dependencies |

::: warning Node.js Version
NectoProxy requires **Node.js 20 or later**. Earlier versions are not supported. You can check your Node.js version by running `node --version`.
:::

## Install via npm (Recommended)

The simplest way to install NectoProxy is as a global npm package:

```bash
npm install -g nectoproxy
```

This makes the `nectoproxy` command available system-wide. You can then start the proxy from any directory:

```bash
nectoproxy start
```

## Run with npx (No Install)

If you prefer not to install NectoProxy globally, you can run it directly using `npx`:

```bash
npx nectoproxy start
```

This downloads and runs the latest version of NectoProxy without permanently installing it. It is a good option for quick one-off debugging sessions or for trying NectoProxy before committing to a global install.

::: tip When to Use npx
Use `npx` when you want to quickly test NectoProxy or ensure you are always running the latest version. Use a global install when you use NectoProxy regularly and want faster startup times.
:::

## Verify Installation

After installing, verify that NectoProxy is correctly installed:

```bash
nectoproxy --version
```

This should print the installed version number (e.g., `0.1.0`).

## Update NectoProxy

To update a globally installed NectoProxy to the latest version:

```bash
npm update -g nectoproxy
```

If you installed NectoProxy with a specific version and want to jump to the latest:

```bash
npm install -g nectoproxy@latest
```

## Uninstall NectoProxy

To remove NectoProxy from your system:

```bash
npm uninstall -g nectoproxy
```

::: details Cleaning Up Data Files
Uninstalling the npm package does not remove the NectoProxy data directory. To fully clean up, also remove the data directory:

```bash
# macOS / Linux
rm -rf ~/.nectoproxy

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:USERPROFILE\.nectoproxy"
```

This directory contains:
- `certs/` -- Generated CA and domain certificates
- `nectoproxy.db` -- SQLite database with sessions, traffic, rules, and settings
:::

## Build from Source

If you want to contribute to NectoProxy or run the development version, you can build it from source.

### Prerequisites

- **Node.js** 20 or later
- **pnpm** package manager (version 9.0.0 or later)
- **Git**

### Steps

1. **Clone the repository**

    ```bash
    git clone https://github.com/sitharaj88/nectoproxy.git
    cd nectoproxy
    ```

2. **Install dependencies**

    ```bash
    pnpm install
    ```

3. **Build all packages**

    ```bash
    pnpm build
    ```

4. **Run the CLI**

    ```bash
    node apps/cli/dist/index.js start
    ```

### Development Mode

To run NectoProxy in development mode with live reloading:

```bash
pnpm dev
```

This starts all packages in watch mode using Turborepo, so changes to any package are automatically rebuilt.

### Running Tests

```bash
pnpm test
```

::: tip pnpm Installation
If you do not have pnpm installed, you can install it via npm:

```bash
npm install -g pnpm@9
```

Or use Corepack (bundled with Node.js 16.9+):

```bash
corepack enable
corepack prepare pnpm@9 --activate
```
:::

## Troubleshooting

### Permission Errors on Global Install

If you encounter `EACCES` permission errors when installing globally on macOS or Linux, you have two options:

**Option 1: Use a Node version manager (recommended)**

Tools like [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) install Node.js in your home directory, avoiding permission issues entirely.

**Option 2: Fix npm permissions**

```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
```

Then add `~/.npm-global/bin` to your `PATH` in your shell configuration file (e.g., `~/.bashrc`, `~/.zshrc`).

### Node.js Version Too Old

If you see an error about unsupported engine or syntax errors, verify your Node.js version:

```bash
node --version
```

If it is below v20, upgrade Node.js using your preferred method (nvm, fnm, official installer, or system package manager).
