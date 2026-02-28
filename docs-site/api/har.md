# HAR API

The HAR (HTTP Archive) API enables exporting captured traffic to the standard HAR 1.2 format, importing HAR files from other tools (such as Chrome DevTools or Firefox), and validating HAR files.

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/har/export/:sessionId` | Export an entire session as HAR |
| `POST` | `/api/har/export` | Export selected entries as HAR |
| `POST` | `/api/har/import` | Import a HAR file |
| `POST` | `/api/har/validate` | Validate a HAR file |

---

## Export Session as HAR

```
GET /api/har/export/:sessionId
```

Export all traffic entries in a session as a HAR 1.2 file. The response is returned as a downloadable JSON file.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `sessionId` | `string` | Session ID to export |

### Example Request

```bash
curl http://localhost:8889/api/har/export/session-uuid -o traffic.har
```

### Response `200 OK`

The response includes download headers:

```
Content-Type: application/json
Content-Disposition: attachment; filename="My_Session_1709136000000.har"
```

```json
{
  "log": {
    "version": "1.2",
    "creator": {
      "name": "NectoProxy",
      "version": "1.0.0"
    },
    "entries": [
      {
        "startedDateTime": "2024-02-28T12:00:00.000Z",
        "time": 145,
        "request": {
          "method": "GET",
          "url": "https://api.example.com/users",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [
            { "name": "Accept", "value": "application/json" }
          ],
          "queryString": [],
          "headersSize": -1,
          "bodySize": 0
        },
        "response": {
          "status": 200,
          "statusText": "OK",
          "httpVersion": "HTTP/1.1",
          "cookies": [],
          "headers": [
            { "name": "Content-Type", "value": "application/json" }
          ],
          "content": {
            "size": 1234,
            "mimeType": "application/json",
            "text": "{\"users\": []}"
          },
          "redirectURL": "",
          "headersSize": -1,
          "bodySize": 1234
        },
        "cache": {},
        "timings": {
          "send": -1,
          "wait": 145,
          "receive": -1
        }
      }
    ]
  }
}
```

### Error `404 Not Found`

```json
{
  "error": "Session not found"
}
```

---

## Export Selected Entries

```
POST /api/har/export
```

Export a specific set of traffic entries as a HAR file.

### Request Body

```json
{
  "entryIds": [
    "entry-uuid-1",
    "entry-uuid-2",
    "entry-uuid-3"
  ],
  "sessionName": "Custom Export Name"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `entryIds` | `string[]` | Yes | Array of traffic entry IDs to export |
| `sessionName` | `string` | No | Custom name for the HAR export. Default: `"NectoProxy Export"` |

### Example Request

```bash
curl -X POST http://localhost:8889/api/har/export \
  -H "Content-Type: application/json" \
  -d '{"entryIds": ["entry-uuid-1", "entry-uuid-2"]}' \
  -o selected.har
```

### Response `200 OK`

Returns a HAR JSON file with download headers (same format as session export).

### Error `400 Bad Request`

```json
{
  "error": "No entry IDs provided"
}
```

### Error `404 Not Found`

```json
{
  "error": "No valid entries found"
}
```

---

## Import HAR File

```
POST /api/har/import
```

Import traffic entries from a HAR file. The request must use `multipart/form-data` encoding.

::: warning Content Type
This endpoint does NOT accept `application/json`. Use `multipart/form-data` with the HAR file attached as the `file` field.
:::

### Form Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `file` | Yes | The HAR file to import |
| `sessionId` | `string` | No | Import into an existing session. If omitted, a new session is created. |
| `sessionName` | `string` | No | Name for the auto-created session |

### Example Request

```bash
# Import into a new session (auto-created)
curl -X POST http://localhost:8889/api/har/import \
  -F "file=@traffic.har"

# Import into an existing session
curl -X POST http://localhost:8889/api/har/import \
  -F "file=@traffic.har" \
  -F "sessionId=session-uuid"

# Import with a custom session name
curl -X POST http://localhost:8889/api/har/import \
  -F "file=@chrome-export.har" \
  -F "sessionName=Chrome DevTools Export"
```

### Response `200 OK`

```json
{
  "success": true,
  "imported": 47,
  "total": 50,
  "sessionId": "new-session-uuid",
  "sessionName": "Imported: chrome-export"
}
```

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | Whether the import completed |
| `imported` | `number` | Number of entries successfully imported |
| `total` | `number` | Total number of entries in the HAR file |
| `sessionId` | `string` | ID of the session entries were imported into |
| `sessionName` | `string` | Name of the session |

::: tip Partial Imports
If some entries fail to import (e.g., malformed data), the `imported` count will be less than `total`. The import continues with valid entries and does not abort on individual entry failures.
:::

### Error `400 Bad Request`

```json
{
  "error": "No file provided"
}
```

```json
{
  "error": "Invalid HAR file format"
}
```

```json
{
  "error": "Invalid HAR structure"
}
```

### Error `404 Not Found`

```json
{
  "error": "Session not found"
}
```

---

## Validate HAR File

```
POST /api/har/validate
```

Validate a HAR file without importing it. Checks the JSON structure and HAR format compliance.

### Form Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | `file` | Yes | The HAR file to validate |

### Example Request

```bash
curl -X POST http://localhost:8889/api/har/validate \
  -F "file=@traffic.har"
```

### Response `200 OK` (valid)

```json
{
  "valid": true,
  "version": "1.2",
  "creator": {
    "name": "Google Chrome",
    "version": "120.0.0"
  },
  "entryCount": 47
}
```

### Response `400 Bad Request` (invalid)

```json
{
  "valid": false,
  "error": "Invalid JSON format"
}
```

```json
{
  "valid": false,
  "error": "Missing log property"
}
```

```json
{
  "valid": false,
  "error": "Missing or invalid entries array"
}
```

### Error `400 Bad Request`

```json
{
  "error": "No file provided"
}
```

---

## Example: Round-Trip Export and Import

::: details Export from one session, import to another

```bash
# Step 1: Export session traffic
curl http://localhost:8889/api/har/export/session-uuid-1 -o backup.har

# Step 2: Validate the exported file
curl -X POST http://localhost:8889/api/har/validate \
  -F "file=@backup.har"
# Response: {"valid": true, "version": "1.2", "entryCount": 42}

# Step 3: Create a new session for the import
curl -X POST http://localhost:8889/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "Restored Backup"}'
# Note the session ID from the response

# Step 4: Import into the new session
curl -X POST http://localhost:8889/api/har/import \
  -F "file=@backup.har" \
  -F "sessionId=new-session-uuid"
```
:::

::: details Import from Chrome DevTools

```bash
# 1. Open Chrome DevTools -> Network tab
# 2. Right-click -> Save all as HAR with content
# 3. Import the HAR file:
curl -X POST http://localhost:8889/api/har/import \
  -F "file=@www.example.com.har" \
  -F "sessionName=Chrome Capture"
```
:::
