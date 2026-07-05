---
title: MCP / AI Integration
description: Expose captured traffic, rules, and request replay to AI assistants like Claude via the NectoProxy Model Context Protocol (MCP) server.
---

# MCP / AI Integration

NectoProxy ships a **Model Context Protocol (MCP)** server that makes it AI-native. An AI assistant -- Claude Desktop, Claude Code, Cursor, and other MCP clients -- can inspect captured traffic, manage the rules engine, and replay requests during a live debugging session.

The server speaks MCP over **stdio** and talks to a running NectoProxy instance through its control-plane REST API.

## Prerequisites

1. Start NectoProxy: `nectoproxy start`.
2. Copy the **session token** it prints. It appears in the Web UI URL as `http://localhost:8889/?token=<TOKEN>`. Every `/api/*` request requires this token, so the MCP server needs it too. See [Security & Session Token](./security).

## Running the Server

```bash
nectoproxy mcp --token <TOKEN>
```

Point it at a non-default control plane with `--url`:

```bash
nectoproxy mcp --token <TOKEN> --url http://127.0.0.1:8889
```

### Configuration

The server reads configuration from CLI args first, then environment variables, then defaults:

| Setting | CLI arg | Env var | Default |
|---|---|---|---|
| API URL | `--url` | `NECTO_API_URL` | `http://127.0.0.1:8889` |
| Token | `--token` | `NECTO_TOKEN` | _(required)_ |

If no token is supplied via `--token` or `NECTO_TOKEN`, the server exits with an error (the token is mandatory).

::: tip stdio is the transport
The MCP server communicates over stdio -- `stdout` is the JSON-RPC channel and must stay clean, so all diagnostics go to `stderr`. You normally do not run it by hand; your MCP client launches it for you (see below).
:::

## Registering with Claude Desktop / Claude Code

Add NectoProxy to your `mcpServers` config (`claude_desktop_config.json` for Claude Desktop, or `.mcp.json` / `claude mcp add` for Claude Code):

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

Add `"--url", "http://127.0.0.1:8889"` to `args` if your Web UI runs on a different host or port. You can also supply the token via environment variable instead of args:

```json
{
  "mcpServers": {
    "nectoproxy": {
      "command": "nectoproxy",
      "args": ["mcp"],
      "env": { "NECTO_TOKEN": "<TOKEN>" }
    }
  }
}
```

::: warning Update the token after each restart
The session token is regenerated every time you run `nectoproxy start`. After restarting the proxy, update the token in your MCP client configuration.
:::

## Available Tools

The MCP server exposes nine tools across traffic inspection, the rules engine, and replay:

| Tool | Description |
|---|---|
| `list_traffic` | List recent captured requests as compact summaries (optional method/status/host filter) |
| `get_traffic` | Full detail for one entry by id -- headers and bodies, decoded as text when possible |
| `search_traffic` | Filter traffic by URL substring, method, host, status range, or response content-type |
| `get_traffic_stats` | Aggregate counts: total, by status class, by host, error count, average duration |
| `list_rules` | List all rules in the rules engine |
| `create_rule` | Create a rule -- supports `mock`, `block`, `modify-request`, and `modify-response` actions |
| `toggle_rule` | Enable or disable a rule by id |
| `delete_rule` | Delete a rule by id |
| `replay_request` | Re-send a captured request by id (optionally overriding method/url/headers/body) |

## Running Standalone

The MCP package also exposes a `nectoproxy-mcp` binary, useful for MCP clients that expect a dedicated command:

```bash
NECTO_TOKEN=<TOKEN> nectoproxy-mcp
# or
nectoproxy-mcp --token <TOKEN> --url http://127.0.0.1:8889
```

## Example Prompts

Once registered, you can ask your AI assistant things like:

- "List the failing requests captured in the last session and summarize the errors."
- "Search the traffic for calls to `api.stripe.com` and show me the request bodies."
- "Create a mock rule that returns a 500 for `GET https://api.example.com/orders`."
- "Replay request `abc123` with the `Authorization` header removed and tell me what changed."

## See Also

- [`nectoproxy mcp`](/cli/mcp) -- the CLI command reference
- [Security & Session Token](./security) -- where the token comes from
- [Rules Engine](./rules-engine) -- the rules the MCP tools create and toggle
- [Request Replay](./request-replay) -- the replay feature exposed via `replay_request`
