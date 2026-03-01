# CLI Reference

NectoProxy is controlled entirely through its command-line interface. This page provides an overview of all available commands and global options.

## Global Options

| Option | Description |
|---|---|
| `--version` | Print the NectoProxy version number and exit |
| `--help` | Display help information for any command |

```bash
# Print version
nectoproxy --version

# Show global help
nectoproxy --help
```

## Commands

NectoProxy provides three commands:

| Command | Description | Details |
|---|---|---|
| [`start`](/cli/start) | Start the proxy server and Web UI | The primary command. Launches the MITM proxy and opens the browser-based dashboard. |
| [`cert`](/cli/cert) | Manage CA certificates | View certificate info, get installation instructions, print paths, and clear the domain certificate cache. |
| [`sessions`](/cli/sessions) | Manage traffic sessions | List, create, and delete named sessions for organizing captured traffic. |

## Quick Reference

The following table summarizes every command and option available in NectoProxy:

```bash
# Start the proxy (default: proxy on 8888, UI on 8889)
nectoproxy start
nectoproxy start -p 9090 -u 9091       # Custom ports
nectoproxy start --host 127.0.0.1      # Restrict to localhost only
nectoproxy start --no-open             # Don't auto-open browser

# Certificate management
nectoproxy cert                         # Show CA certificate info
nectoproxy cert --install              # Show installation instructions
nectoproxy cert --path                 # Print CA certificate file path
nectoproxy cert --clear-cache          # Clear cached domain certificates

# Session management
nectoproxy sessions                    # List all sessions
nectoproxy sessions --list             # List all sessions (explicit)
nectoproxy sessions --create "Debug"   # Create a new session named "Debug"
nectoproxy sessions --delete <id>      # Delete a session by ID

# General
nectoproxy --version                   # Print version
nectoproxy --help                      # Show help
nectoproxy start --help                # Show help for the start command
```

## Getting Help

Every command supports the `--help` flag to display usage information:

```bash
nectoproxy start --help
nectoproxy cert --help
nectoproxy sessions --help
```

::: tip Command Details
Click on any command in the table above to see its full documentation with all options, examples, and usage notes.
:::
