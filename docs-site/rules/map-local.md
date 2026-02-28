---
title: Map Local Action
description: Serve files from your local filesystem instead of fetching them from remote servers. Replace CDN resources, test local builds, and develop offline.
---

# Map Local Action

The **Map Local** action intercepts a matched request and serves a file from your local filesystem instead of forwarding the request to the upstream server. This effectively replaces any remote resource with a local file.

Map Local is the go-to action when you need to test local CSS, JavaScript, images, or API fixture files against a production or staging website without deploying anything.

## How It Works

1. A request arrives at the proxy and matches a rule with the `mapLocal` action.
2. NectoProxy reads the file at the configured local path.
3. The file contents are returned to the client as the response body.
4. The request is **not** forwarded to the target server.

```
Client ──► NectoProxy ──✕ (request NOT forwarded)
                │
                └──► Reads local file
                └──► Returns file contents to client
```

::: tip
NectoProxy automatically infers the `Content-Type` header from the file extension (e.g., `.json` returns `application/json`, `.js` returns `application/javascript`). You do not need to configure response headers manually in most cases.
:::

## Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `localPath` | string | Yes | -- | Absolute path to a local file or directory |
| `preserveHost` | boolean | No | `false` | Keep the original `Host` header in the response context |

### File vs. Directory Mapping

- **File path**: When `localPath` points to a single file, that file is served for every request matching the rule, regardless of the original URL path.
- **Directory path**: When `localPath` points to a directory, NectoProxy maps the URL path to files within that directory. For example, a request to `/api/users.json` served from `/home/user/fixtures/` would read `/home/user/fixtures/api/users.json`.

## Practical Examples

### Example 1: Replace a Remote JavaScript File with a Local Build

Test your local JavaScript build against a production website without deploying.

```json
{
  "name": "Map Local App JS",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*/static/js/app.bundle.js"
  },
  "action": "mapLocal",
  "config": {
    "localPath": "/home/user/project/dist/app.bundle.js"
  }
}
```

Test it:

```bash
curl -x http://localhost:8888 -s https://www.example.com/static/js/app.bundle.js | head -5
```

This returns the contents of your local `app.bundle.js` instead of the version hosted on the server.

::: tip
This technique is invaluable for debugging production issues. You can inject a non-minified, source-mapped version of your JavaScript into the production site running in your browser.
:::

### Example 2: Serve Local API Fixtures

Replace a remote API endpoint with a local JSON fixture file.

```json
{
  "name": "Map Local User Data",
  "enabled": true,
  "priority": 2,
  "matchPattern": {
    "url": "*/api/v1/users",
    "method": "GET"
  },
  "action": "mapLocal",
  "config": {
    "localPath": "/home/user/fixtures/users.json"
  }
}
```

Where `/home/user/fixtures/users.json` contains:

```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@test.com" },
    { "id": 2, "name": "Bob", "email": "bob@test.com" },
    { "id": 3, "name": "Carol", "email": "carol@test.com" }
  ],
  "total": 3
}
```

```bash
curl -x http://localhost:8888 -s http://api.example.com/api/v1/users | python3 -m json.tool
```

### Example 3: Replace CDN Stylesheets with Local Versions

Test CSS changes against a live site by mapping the remote stylesheet to your local file.

```json
{
  "name": "Map Local CSS",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*cdn.example.com/css/main.css*"
  },
  "action": "mapLocal",
  "config": {
    "localPath": "/home/user/project/src/styles/main.css"
  }
}
```

### Example 4: Map an Entire Directory of Static Assets

Serve all static files from a local directory, preserving the path structure.

```json
{
  "name": "Map Local Static Assets",
  "enabled": true,
  "priority": 3,
  "matchPattern": {
    "url": "*/static/*"
  },
  "action": "mapLocal",
  "config": {
    "localPath": "/home/user/project/dist/static/",
    "preserveHost": true
  }
}
```

With this configuration:
- `https://example.com/static/css/app.css` serves from `/home/user/project/dist/static/css/app.css`
- `https://example.com/static/js/vendor.js` serves from `/home/user/project/dist/static/js/vendor.js`
- `https://example.com/static/images/logo.png` serves from `/home/user/project/dist/static/images/logo.png`

::: warning
When using directory mapping, make sure the directory structure on disk mirrors the URL path structure. If the file does not exist at the resolved path, NectoProxy will return a `404 Not Found` response.
:::

### Example 5: Map Local for Offline Development

Combine multiple Map Local rules to create a fully offline development environment.

```json
{
  "name": "Offline API Fixtures",
  "enabled": true,
  "priority": 1,
  "matchPattern": {
    "url": "*/api/*",
    "host": "api.example.com"
  },
  "action": "mapLocal",
  "config": {
    "localPath": "/home/user/offline-fixtures/api/"
  }
}
```

```json
{
  "name": "Offline Static Assets",
  "enabled": true,
  "priority": 2,
  "matchPattern": {
    "url": "*/assets/*",
    "host": "cdn.example.com"
  },
  "action": "mapLocal",
  "config": {
    "localPath": "/home/user/offline-fixtures/assets/"
  }
}
```

## Use Cases

### Testing with Local CSS and JavaScript

Replace production-minified frontend resources with your local development builds. This lets you debug and test changes against the real site without deploying to a staging environment.

### Replacing CDN Resources

Override resources served by CDNs (fonts, icons, stylesheets, JavaScript libraries) with local versions. This is useful for testing upgrades to third-party libraries.

### Serving Local API Fixtures

Map API endpoints to local JSON files for deterministic testing. Edit the fixture files with your code editor and see the changes reflected immediately without restarting any server.

### Offline Development

Build a set of fixture files that cover all the API endpoints and static resources your application needs. With Map Local rules pointing to these fixtures, you can develop and test without any network connectivity.

::: details Map Local vs. Mock
Both Map Local and [Mock](./mock) serve responses without contacting the real server. The key differences:

| Aspect | Map Local | Mock |
|--------|-----------|------|
| **Response source** | File on disk | Inline in rule config |
| **Best for** | Large files, binary assets, frequently edited content | Small JSON payloads, simple responses |
| **Editing workflow** | Edit files with your code editor | Edit in NectoProxy UI |
| **Binary support** | Yes (images, fonts, etc.) | Text only |
| **Dynamic content** | No | No |

Use **Map Local** when responding with existing files or content that benefits from code editor support. Use **Mock** when the response is small and self-contained.
:::

::: danger
Ensure that the `localPath` points to files you intend to serve. NectoProxy will read and return the contents of the specified file, so do not point Map Local rules at sensitive files (private keys, configuration files with secrets, etc.).
:::
