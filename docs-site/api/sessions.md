# Sessions API

The Sessions API manages capture sessions. Sessions are containers for grouping traffic entries, allowing you to organize captured traffic by task, feature, or time period.

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/sessions/active` | Get the active session |
| `GET` | `/api/sessions/:id` | Get a specific session |
| `POST` | `/api/sessions` | Create a new session |
| `PATCH` | `/api/sessions/:id` | Update a session |
| `POST` | `/api/sessions/:id/activate` | Set session as active |
| `DELETE` | `/api/sessions/:id` | Delete a session |

---

## List All Sessions

```
GET /api/sessions
```

### Example Request

```bash
curl http://localhost:8889/api/sessions
```

### Response `200 OK`

```json
{
  "sessions": [
    {
      "id": "session-uuid-1",
      "name": "Bug Investigation",
      "isActive": true,
      "isRecording": true,
      "createdAt": 1709136000000,
      "updatedAt": 1709136500000,
      "trafficCount": 142,
      "totalBytes": 2457600
    },
    {
      "id": "session-uuid-2",
      "name": "Feature Testing",
      "isActive": false,
      "isRecording": false,
      "createdAt": 1709130000000,
      "updatedAt": 1709135000000,
      "trafficCount": 87,
      "totalBytes": 1024000
    }
  ]
}
```

---

## Get Active Session

```
GET /api/sessions/active
```

Retrieve the currently active session. New traffic is captured into the active session.

### Example Request

```bash
curl http://localhost:8889/api/sessions/active
```

### Response `200 OK`

```json
{
  "id": "session-uuid-1",
  "name": "Bug Investigation",
  "isActive": true,
  "isRecording": true,
  "createdAt": 1709136000000,
  "updatedAt": 1709136500000,
  "trafficCount": 142,
  "totalBytes": 2457600
}
```

### Error `404 Not Found`

```json
{
  "error": "No active session"
}
```

---

## Get Specific Session

```
GET /api/sessions/:id
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Session ID |

### Example Request

```bash
curl http://localhost:8889/api/sessions/session-uuid-1
```

### Response `200 OK`

Returns the full session object.

### Error `404 Not Found`

```json
{
  "error": "Session not found"
}
```

---

## Create a Session

```
POST /api/sessions
```

Create a new capture session.

### Request Body

```json
{
  "name": "API Debugging Session"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | No | Session name. Default: `"Session <current date/time>"` |

### Example Request

```bash
curl -X POST http://localhost:8889/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "Login Flow Testing"}'
```

### Response `201 Created`

```json
{
  "id": "session-uuid-3",
  "name": "Login Flow Testing",
  "isActive": false,
  "isRecording": false,
  "createdAt": 1709136600000,
  "updatedAt": 1709136600000,
  "trafficCount": 0,
  "totalBytes": 0
}
```

::: tip Auto-Generated Name
If you omit the `name` field, a name is automatically generated using the current date and time, for example: `"Session 2/28/2026, 3:00:00 PM"`.
:::

---

## Update a Session

```
PATCH /api/sessions/:id
```

Update session properties such as name, active state, or recording state.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Session ID |

### Request Body

```json
{
  "name": "Renamed Session",
  "isRecording": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | No | Updated session name |
| `isActive` | `boolean` | No | Set as active session |
| `isRecording` | `boolean` | No | Enable or disable recording |

### Example Request

```bash
curl -X PATCH http://localhost:8889/api/sessions/session-uuid-1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Completed Investigation", "isRecording": false}'
```

### Response `200 OK`

Returns the updated session object.

### Error `404 Not Found`

```json
{
  "error": "Session not found"
}
```

---

## Activate a Session

```
POST /api/sessions/:id/activate
```

Set a session as the active session. The previously active session is deactivated. All new traffic is captured into the active session.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Session ID to activate |

### Example Request

```bash
curl -X POST http://localhost:8889/api/sessions/session-uuid-2/activate
```

### Response `200 OK`

```json
{
  "id": "session-uuid-2",
  "name": "Feature Testing",
  "isActive": true,
  "isRecording": true,
  "createdAt": 1709130000000,
  "updatedAt": 1709136700000,
  "trafficCount": 87,
  "totalBytes": 1024000
}
```

### Error `404 Not Found`

```json
{
  "error": "Session not found"
}
```

::: warning Single Active Session
Only one session can be active at a time. Activating a session automatically deactivates the previously active session.
:::

---

## Delete a Session

```
DELETE /api/sessions/:id
```

Delete a session and all its associated traffic data.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Session ID |

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/sessions/session-uuid-2
```

### Response `200 OK`

```json
{
  "success": true
}
```

### Error `404 Not Found`

```json
{
  "error": "Session not found"
}
```

::: warning Irreversible
Deleting a session permanently removes all associated traffic data, annotations, and WebSocket frames. This operation cannot be undone.
:::

---

## Session Schema

::: details Full Session Schema
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique session identifier |
| `name` | `string` | Human-readable session name |
| `isActive` | `boolean` | Whether this is the currently active session |
| `isRecording` | `boolean` | Whether new traffic is being captured |
| `createdAt` | `number` | Unix timestamp in milliseconds |
| `updatedAt` | `number` | Unix timestamp in milliseconds |
| `trafficCount` | `number` | Number of traffic entries in this session |
| `totalBytes` | `number` | Total size of all traffic in bytes |
:::

---

## Example: Session Workflow

::: details Create, use, and clean up sessions

```bash
# 1. Create a new session for a specific task
curl -X POST http://localhost:8889/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "Checkout Flow Debug"}'
# Note the returned session ID

# 2. Activate the session to start capturing traffic
curl -X POST http://localhost:8889/api/sessions/SESSION_ID/activate

# 3. ... perform your testing ...

# 4. Stop recording
curl -X PATCH http://localhost:8889/api/sessions/SESSION_ID \
  -H "Content-Type: application/json" \
  -d '{"isRecording": false}'

# 5. Export traffic for later analysis
curl http://localhost:8889/api/har/export/SESSION_ID -o checkout-debug.har

# 6. Clean up when done
curl -X DELETE http://localhost:8889/api/sessions/SESSION_ID
```
:::
