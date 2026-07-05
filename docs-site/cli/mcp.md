# nectoproxy mcp

The `mcp` command starts a **Model Context Protocol (MCP)** server over stdio, exposing NectoProxy's captured traffic, rules engine, and request replay to AI assistants such as Claude Desktop and Claude Code.

For the full feature overview, tool list, and client-registration JSON, see [MCP / AI Integration](/features/mcp).

## Usage

```bash
nectoproxy mcp --token <token> [options]
```

## Options

| Option | Alias | Default | Description |
|---|---|---|---|
| `--token <token>` | `-t` | _(required)_ | Session token printed by `nectoproxy start` (or set `NECTO_TOKEN`) |
| `--url <url>` | `-u` | `http://127.0.0.1:8889` | NectoProxy control-plane API URL (or set `NECTO_API_URL`) |

Configuration is read from CLI args first, then environment variables, then defaults.

| Setting | CLI arg | Env var | Default |
|---|---|---|---|
| API URL | `--url` | `NECTO_API_URL` | `http://127.0.0.1:8889` |
| Token | `--token` | `NECTO_TOKEN` | _(required)_ |

## The Session Token Is Required

The MCP server talks to the control-plane API, which is protected by a session token. The token is printed by `nectoproxy start` inside the Web UI URL:

```
  Web UI:       http://localhost:8889/?token=<TOKEN>
```

Supply it via `--token` or the `NECTO_TOKEN` environment variable. If no token is provided, the command exits with an error.

::: warning Token changes on every restart
A new token is generated each time you run `nectoproxy start`. Update your MCP client configuration after restarting the proxy.
:::

## Examples

### Start the server with a token

```bash
nectoproxy mcp --token 3f9c1a...e7
```

### Use an environment variable

```bash
export NECTO_TOKEN=3f9c1a...e7
nectoproxy mcp
```

### Point at a custom control-plane URL

```bash
nectoproxy mcp --token <TOKEN> --url http://127.0.0.1:9091
```

## How It Is Used

You normally do not run `nectoproxy mcp` by hand -- your MCP client launches it. Register it in your client's `mcpServers` config:

```json
{
  "mcpServers": {
    "nectoproxy": {
      "command": "nectoproxy",
      "args": ["mcp", "--token", "<TOKEN>"]
    }
  }
}
```

::: tip stdio transport
The server speaks JSON-RPC over stdio. `stdout` is reserved for the protocol channel; all logs and errors are written to `stderr`.
:::

## See Also

- [MCP / AI Integration](/features/mcp) -- feature overview and the nine available tools
- [Security & Session Token](/features/security) -- how the token protects the control plane
