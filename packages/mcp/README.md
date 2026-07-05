# @nectoproxy/mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for
**NectoProxy**. It makes NectoProxy AI-native: an AI assistant (Claude Desktop,
Claude Code, Cursor, etc.) can inspect captured traffic, manage the rules
engine, and replay requests during a live debugging session.

The server speaks MCP over **stdio** and talks to a running NectoProxy instance
through its control-plane REST API.

## Prerequisites

1. Start NectoProxy: `nectoproxy start`.
2. Copy the **session token** it prints (it appears in the Web UI URL as
   `http://localhost:8889/?token=<TOKEN>`). Every `/api/*` request requires this
   token, so the MCP server needs it too.

## Configuration

The server reads configuration from CLI args first, then environment variables,
then defaults:

| Setting  | CLI arg     | Env var         | Default                  |
| -------- | ----------- | --------------- | ------------------------ |
| API URL  | `--url`     | `NECTO_API_URL` | `http://127.0.0.1:8889`  |
| Token    | `--token`   | `NECTO_TOKEN`   | _(required)_             |

## Registering with Claude Desktop / Claude Code

Add this to your `mcpServers` config (`claude_desktop_config.json` for Claude
Desktop, or `.mcp.json` / `claude mcp add` for Claude Code):

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

Add `"--url", "http://127.0.0.1:8889"` to `args` if your Web UI runs on a
different host/port. You can also supply the token via env instead of args:

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

## Tools

| Tool                | Description                                                                              |
| ------------------- | --------------------------------------------------------------------------------------- |
| `list_traffic`      | List recent captured requests as compact summaries (optional method/status/host filter) |
| `get_traffic`       | Full detail for one entry by id — headers + bodies, decoded as text when possible       |
| `search_traffic`    | Filter traffic by URL substring, method, host, status range, or response content-type   |
| `get_traffic_stats` | Aggregate counts: total, by status class, by host, error count, average duration        |
| `list_rules`        | List all rules in the rules engine                                                      |
| `create_rule`       | Create a rule — supports `mock`, `block`, `modify-request`, `modify-response` actions    |
| `toggle_rule`       | Enable/disable a rule by id                                                              |
| `delete_rule`       | Delete a rule by id                                                                     |
| `replay_request`    | Re-send a captured request by id (optionally overriding method/url/headers/body)         |

## Running standalone

The package also exposes a `nectoproxy-mcp` bin:

```bash
NECTO_TOKEN=<TOKEN> nectoproxy-mcp
# or
nectoproxy-mcp --token <TOKEN> --url http://127.0.0.1:8889
```
