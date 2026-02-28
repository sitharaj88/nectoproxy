---
title: Search & Filtering
description: Find and filter captured HTTP traffic quickly with NectoProxy's search capabilities.
---

# Search & Filtering

NectoProxy provides multiple ways to find specific traffic entries. From the filter bar for quick column-based filtering to the global search for cross-session queries, these tools help you locate the requests you need in seconds, even across sessions with thousands of entries.

## Filter Bar

The filter bar sits at the top of the traffic list and provides **column-based filtering** to narrow down the displayed entries. Filters are applied in real time as you type.

### Available Filters

| Filter | Description | Examples |
|---|---|---|
| **Method** | Filter by HTTP method | `GET`, `POST`, `PUT`, `DELETE`, `PATCH` |
| **Status** | Filter by response status code | `200`, `404`, `500`, `2xx`, `4xx`, `5xx` |
| **URL** | Filter by request URL (partial match) | `/api/users`, `login`, `.js` |
| **Host** | Filter by hostname | `api.example.com`, `cdn.example.com` |
| **Content Type** | Filter by response content type | `application/json`, `text/html`, `image/` |

### Combining Filters

Multiple filters can be applied simultaneously. When multiple filters are active, they work with **AND logic** -- an entry must match all active filters to be displayed.

::: details Example: Finding Failed API Calls
To find all failed JSON API calls to your backend:

| Filter | Value |
|---|---|
| Host | `api.example.com` |
| Status | `5xx` |
| Content Type | `application/json` |

This shows only requests to `api.example.com` that returned a 5xx error with a JSON response body.
:::

### Status Code Filtering

Status codes can be filtered by exact code or by class:

| Input | Matches |
|---|---|
| `200` | Only 200 OK responses |
| `404` | Only 404 Not Found responses |
| `2xx` | All successful responses (200-299) |
| `3xx` | All redirect responses (300-399) |
| `4xx` | All client error responses (400-499) |
| `5xx` | All server error responses (500-599) |

### URL Filtering

URL filtering performs a **partial match** against the full request URL (including query parameters). This means:

```
Filter: /api/users
Matches:
  https://example.com/api/users
  https://example.com/api/users/123
  https://example.com/api/users?page=2
  https://example.com/v2/api/users/search
```

::: tip
For more precise URL matching (glob, wildcard, regex), use the [Rules Engine](./rules-engine) to highlight or flag specific requests instead of the filter bar.
:::

### Clearing Filters

Click the **Clear** button next to the filter bar to remove all active filters and show the complete traffic list.

## Global Search

Global search lets you search across **all sessions** for traffic entries matching your query. This is useful when you do not remember which session contains the request you are looking for.

### Activating Global Search

Press **`Ctrl+Shift+F`** (or **`Cmd+Shift+F`** on macOS) to open the global search panel.

### Search Scope

Global search queries against:

- Request URL
- Request headers (names and values)
- Response headers (names and values)
- Request body content
- Response body content
- Annotations (notes and tags)

### Search Syntax

| Query | Searches For |
|---|---|
| `api/users` | Any entry with "api/users" anywhere in URL, headers, or body |
| `"exact phrase"` | The exact phrase in quotes |
| `Authorization: Bearer` | Entries with a specific header pattern |
| `error` | Any entry containing the word "error" |

### Search Results

Results are displayed in a dropdown list showing:

- The session name containing the match
- The request method and URL
- A snippet of the matching content with the search term highlighted
- The match location (URL, header, body, annotation)

Click on a result to navigate to that entry in its session.

## Autocomplete Suggestions

As you type in the filter bar or global search, NectoProxy provides **autocomplete suggestions** based on the captured traffic data.

### What is Suggested

| Context | Suggestions |
|---|---|
| **Host filter** | Hostnames seen in captured traffic |
| **URL filter** | URL paths seen in captured traffic |
| **Status filter** | Status codes seen in captured traffic |
| **Content Type filter** | Content types seen in captured traffic |
| **Global search** | Recent search queries and matching URL patterns |

### How Suggestions Work

1. Start typing in a filter field
2. A dropdown appears showing matching suggestions from the captured data
3. Use arrow keys to navigate suggestions
4. Press Enter or click to select a suggestion
5. The filter is applied immediately

::: tip
Autocomplete suggestions are generated from your actual traffic data. This means suggestions are always relevant to what NectoProxy has captured, rather than generic suggestions.
:::

## Recent Searches

NectoProxy remembers your **recent search queries** so you can quickly re-apply previous searches.

### Accessing Recent Searches

- Click on the search field to see a list of recent searches
- Recent searches are displayed in reverse chronological order (most recent first)
- Click on a recent search to re-apply it

### Storage

Recent searches are stored locally and persist across NectoProxy sessions. The list is maintained at a reasonable size -- older queries are removed as new ones are added.

## Command Palette

The command palette provides **quick access** to all NectoProxy features, settings, and navigation through a single keyboard shortcut.

### Opening the Command Palette

Press **`Ctrl+K`** (or **`Cmd+K`** on macOS) to open the command palette.

### What You Can Do

The command palette accepts multiple types of input:

| Input | Action |
|---|---|
| Feature names | Navigate to features (e.g., "Rules," "Breakpoints," "Dashboard") |
| Actions | Execute actions (e.g., "Clear traffic," "Export HAR," "New session") |
| Settings | Open settings panels (e.g., "Upstream proxy," "SSL passthrough") |
| URLs | Filter traffic by URL |
| Commands | Execute proxy commands (e.g., "Start recording," "Stop recording") |

### Example Commands

```
> New Session                    Create a new session
> Export HAR                     Export current session as HAR
> Clear Traffic                  Clear all traffic in active session
> Toggle Rules Panel             Show/hide the rules panel
> Toggle Recording               Start/stop traffic capture
> Open Settings                  Open the settings panel
> SSL Passthrough                Open SSL passthrough configuration
> Keyboard Shortcuts             Show keyboard shortcuts help
```

::: details Command Palette Features
- **Fuzzy matching** -- Type partial words and the palette finds matching commands (e.g., "exp har" matches "Export HAR")
- **Keyboard navigation** -- Use arrow keys to navigate results, Enter to execute
- **Context-aware** -- Some commands are only available in certain contexts
- **Fast** -- The palette opens instantly and results filter as you type
:::

## Practical Workflows

### Workflow 1: Finding a Specific API Call

1. Type the API path in the **URL filter**: `/api/orders/12345`
2. If you get too many results, add the **Method filter**: `POST`
3. Click on the matching entry to inspect it

### Workflow 2: Investigating All Errors

1. Set the **Status filter** to `4xx` or `5xx`
2. Review each error entry in the filtered list
3. Add [Annotations](./annotations) to mark important findings
4. Use **Global Search** to check if similar errors appear in other sessions

### Workflow 3: Finding Who Makes Requests to a Domain

1. Set the **Host filter** to the domain of interest: `analytics.example.com`
2. Review the traffic to understand the request patterns
3. Use timing information to assess the impact on page load

### Workflow 4: Quick Navigation with Command Palette

1. Press `Ctrl+K` to open the command palette
2. Start typing what you want to do: "break" for breakpoints, "rule" for rules, "dash" for dashboard
3. Press Enter to navigate or execute the matched command

---

::: info
Search and filter state is maintained while you navigate within NectoProxy. Filters remain applied until you explicitly clear them, even if you switch between detail panels and the traffic list.
:::
