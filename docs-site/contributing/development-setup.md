# Development Setup

This guide walks you through setting up the NectoProxy development environment so you can build, test, and contribute to the project.

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Minimum Version | Check Command |
|------|:---------------:|---------------|
| **Node.js** | 20.0.0 | `node -v` |
| **pnpm** | 9.0.0 | `pnpm -v` |
| **Git** | 2.x | `git --version` |

### Installing Node.js

If you do not have Node.js 20+, install it using [nvm](https://github.com/nvm-sh/nvm) (recommended) or from [nodejs.org](https://nodejs.org):

```bash
# Using nvm
nvm install 20
nvm use 20

# Verify
node -v  # Should output v20.x.x or later
```

### Installing pnpm

NectoProxy uses pnpm as its package manager. The project specifies `pnpm@9.0.0` as the package manager:

```bash
# Install pnpm globally
npm install -g pnpm@9

# Or use corepack (built into Node.js 16+)
corepack enable
corepack prepare pnpm@9 --activate

# Verify
pnpm -v  # Should output 9.x.x
```

## Clone the Repository

```bash
git clone https://github.com/sitharaj88/nectoproxy.git
cd nectoproxy
```

## Install Dependencies

```bash
pnpm install
```

This installs dependencies for all packages in the monorepo (7 packages total).

## Build the Project

```bash
pnpm build
```

This command builds all packages using Turborepo, which handles dependency ordering and parallel execution automatically. The build order is:

```
1. @nectoproxy/shared      (TypeScript types, no dependencies)
2. @nectoproxy/certs       (depends on shared)
   @nectoproxy/storage     (depends on shared) -- built in parallel with certs
3. @nectoproxy/core        (depends on shared, certs)
4. @nectoproxy/server      (depends on shared, storage, core)
5. @nectoproxy/web         (depends on shared) -- React SPA, built with Vite
6. nectoproxy (CLI)        (depends on all packages, bundles web UI)
```

::: tip
Turborepo caches build outputs. Subsequent builds only recompile packages that have changed, making incremental builds very fast.
:::

### Build Outputs

Each package outputs to a `dist/` directory:

| Package | Output | Contents |
|---------|--------|----------|
| `@nectoproxy/shared` | `packages/shared/dist/` | Compiled TypeScript types |
| `@nectoproxy/certs` | `packages/certs/dist/` | Certificate generation modules |
| `@nectoproxy/storage` | `packages/storage/dist/` | Database modules |
| `@nectoproxy/core` | `packages/core/dist/` | Proxy engine modules |
| `@nectoproxy/server` | `packages/server/dist/` | Express API server |
| `@nectoproxy/web` | `apps/web/dist/` | Built React SPA (HTML, JS, CSS) |
| `nectoproxy` (CLI) | `apps/cli/dist/` | CLI entry point + bundled web UI |

## Development Mode (Watch)

For active development, use watch mode:

```bash
pnpm dev
```

This starts all packages in development/watch mode. File changes trigger automatic rebuilds. Turborepo runs the `dev` script for each package concurrently. The Web UI (Vite) provides Hot Module Replacement (HMR) for instant browser updates during frontend development.

::: warning
Watch mode runs all packages concurrently. This can be resource-intensive. If you are only working on a specific package, consider running dev for just that package. For example:

```bash
# Only develop the web UI
pnpm --filter @nectoproxy/web dev

# Only develop the core proxy
pnpm --filter @nectoproxy/core dev
```
:::

## Running Tests

```bash
pnpm test
```

This runs tests across all packages using Vitest. Tests are located alongside source files in `__tests__/` directories.

### Running Tests for a Specific Package

```bash
# Test only the core package
pnpm --filter @nectoproxy/core test

# Test only the server package
pnpm --filter @nectoproxy/server test
```

### Test Structure

```
packages/core/src/rules/__tests__/RuleMatcher.test.ts
packages/core/src/rules/__tests__/RuleEngine.test.ts
packages/certs/src/__tests__/CertificateManager.test.ts
packages/server/src/services/__tests__/HarConverter.test.ts
```

## Linting

```bash
pnpm lint
```

This runs the linter across all packages.

## Cleaning

To remove all build artifacts and `node_modules`:

```bash
pnpm clean
```

This runs the `clean` script in each package and removes the root `node_modules/` directory.

## Project Structure Overview

```
nectoproxy/
  apps/
    cli/                  # CLI entry point (Commander.js)
    web/                  # React SPA (Vite + TailwindCSS)
  packages/
    shared/               # TypeScript type definitions
    certs/                # CA and domain certificate generation
    storage/              # SQLite database + Drizzle ORM
    core/                 # MITM proxy engine
    server/               # Express REST API + Socket.IO
  docs-site/              # VitePress documentation site
  package.json            # Root package.json (workspace scripts)
  pnpm-workspace.yaml     # pnpm workspace configuration
  turbo.json              # Turborepo build pipeline configuration
  tsconfig.base.json      # Shared TypeScript configuration
  vitest.config.ts        # Shared Vitest configuration
```

For a detailed breakdown of each package, see the [Architecture](./architecture) page.

## Common Development Tasks

### Adding a New API Route

1. Create the route file in `packages/server/src/routes/`.
2. Register the route in `packages/server/src/app.ts`.
3. Add any required types to `packages/shared/src/types/`.
4. If the route needs database access, create or update a repository in `packages/storage/src/repositories/`.

### Adding a New UI Component

1. Create the component in `apps/web/src/components/`.
2. If it needs API calls, add the endpoint function in `apps/web/src/services/api.ts`.
3. If it needs global state, create or update a store in `apps/web/src/stores/`.
4. Import and use the component in the appropriate parent component.

### Adding a New Rule Action

1. Define the action type in `packages/shared/src/types/rules.ts`.
2. Create the action handler in `packages/core/src/rules/actions/`.
3. Register it in `packages/core/src/rules/actions/index.ts`.
4. Add UI support in the Rule Editor component.

### Running the CLI Locally

After building, you can run the CLI directly:

```bash
# From the project root, after building
node apps/cli/dist/index.js start

# Or link it globally for testing
cd apps/cli
pnpm link --global
nectoproxy start
```
