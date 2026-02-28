# Annotations API

The Annotations API allows you to attach notes, color labels, and tags to individual traffic entries. Annotations help you mark interesting requests, flag issues, and organize your analysis.

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/annotations` | List all annotations |
| `GET` | `/api/annotations/:trafficId` | Get annotations for a traffic entry |
| `POST` | `/api/annotations` | Create an annotation |
| `PUT` | `/api/annotations/:id` | Update an annotation |
| `DELETE` | `/api/annotations/:id` | Delete an annotation |

---

## List All Annotations

```
GET /api/annotations
```

Retrieve all annotations across all traffic entries.

### Example Request

```bash
curl http://localhost:8889/api/annotations
```

### Response `200 OK`

```json
{
  "annotations": [
    {
      "id": "ann-uuid-1",
      "trafficId": "traffic-uuid-1",
      "content": "This request returns stale data - investigate caching",
      "color": "red",
      "tags": ["bug", "caching"],
      "createdAt": 1709136000000,
      "updatedAt": 1709136000000
    },
    {
      "id": "ann-uuid-2",
      "trafficId": "traffic-uuid-2",
      "content": "Successful login flow",
      "color": "green",
      "tags": ["auth", "working"],
      "createdAt": 1709136100000,
      "updatedAt": 1709136100000
    }
  ]
}
```

---

## Get Annotations for Traffic Entry

```
GET /api/annotations/:trafficId
```

Retrieve all annotations attached to a specific traffic entry.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `trafficId` | `string` | Traffic entry ID |

### Example Request

```bash
curl http://localhost:8889/api/annotations/traffic-uuid-1
```

### Response `200 OK`

```json
{
  "annotations": [
    {
      "id": "ann-uuid-1",
      "trafficId": "traffic-uuid-1",
      "content": "This request returns stale data - investigate caching",
      "color": "red",
      "tags": ["bug", "caching"],
      "createdAt": 1709136000000,
      "updatedAt": 1709136000000
    }
  ]
}
```

---

## Create an Annotation

```
POST /api/annotations
```

Create a new annotation attached to a traffic entry.

### Request Body

```json
{
  "trafficId": "traffic-uuid-1",
  "content": "Slow response - possible database query issue",
  "color": "yellow",
  "tags": ["performance", "database"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `trafficId` | `string` | Yes | Traffic entry ID to annotate |
| `content` | `string` | Yes | Annotation text content |
| `color` | `string` | No | Color label (see [available colors](#colors)). Default varies. |
| `tags` | `string[]` | No | Array of tag strings for categorization |

### Example Request

```bash
curl -X POST http://localhost:8889/api/annotations \
  -H "Content-Type: application/json" \
  -d '{
    "trafficId": "traffic-uuid-1",
    "content": "Returns 401 when token expires - need refresh logic",
    "color": "red",
    "tags": ["auth", "bug", "token-refresh"]
  }'
```

### Response `201 Created`

```json
{
  "id": "ann-uuid-3",
  "trafficId": "traffic-uuid-1",
  "content": "Returns 401 when token expires - need refresh logic",
  "color": "red",
  "tags": ["auth", "bug", "token-refresh"],
  "createdAt": 1709136200000,
  "updatedAt": 1709136200000
}
```

### Error `400 Bad Request`

```json
{
  "error": "trafficId is required"
}
```

```json
{
  "error": "content is required"
}
```

---

## Update an Annotation

```
PUT /api/annotations/:id
```

Update an existing annotation. Only provided fields are changed.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Annotation ID |

### Request Body

```json
{
  "content": "Updated analysis text",
  "color": "green",
  "tags": ["resolved", "verified"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | `string` | No | Updated annotation text |
| `color` | `string` | No | Updated color label |
| `tags` | `string[]` | No | Updated tags array |

### Example Request

```bash
curl -X PUT http://localhost:8889/api/annotations/ann-uuid-1 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Fixed - caching issue resolved with Cache-Control headers",
    "color": "green",
    "tags": ["resolved", "caching"]
  }'
```

### Response `200 OK`

Returns the updated annotation object.

### Error `404 Not Found`

```json
{
  "error": "Annotation not found"
}
```

---

## Delete an Annotation

```
DELETE /api/annotations/:id
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Annotation ID |

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/annotations/ann-uuid-1
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
  "error": "Annotation not found"
}
```

---

## Available Colors {#colors}

Annotations support the following color labels for visual categorization:

| Color | Typical Usage |
|---|---|
| `gray` | General notes, informational |
| `red` | Bugs, errors, critical issues |
| `orange` | Warnings, attention needed |
| `yellow` | Performance concerns, investigation needed |
| `green` | Working correctly, verified, resolved |
| `blue` | Informational, reference points |
| `purple` | Special cases, custom behavior |

---

## Annotation Schema

::: details Full Annotation Schema
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique annotation identifier |
| `trafficId` | `string` | ID of the traffic entry this annotation is attached to |
| `content` | `string` | Annotation text content |
| `color` | `string` | Color label: `gray`, `red`, `orange`, `yellow`, `green`, `blue`, or `purple` |
| `tags` | `string[]` | Array of tag strings for categorization |
| `createdAt` | `number` | Unix timestamp in milliseconds |
| `updatedAt` | `number` | Unix timestamp in milliseconds |
:::

---

## Example: Bug Investigation Workflow

::: details Annotate requests during debugging

```bash
# Mark a suspicious request
curl -X POST http://localhost:8889/api/annotations \
  -H "Content-Type: application/json" \
  -d '{
    "trafficId": "traffic-uuid-1",
    "content": "Returns 500 intermittently - race condition?",
    "color": "red",
    "tags": ["bug", "intermittent", "500-error"]
  }'

# Mark the successful case for comparison
curl -X POST http://localhost:8889/api/annotations \
  -H "Content-Type: application/json" \
  -d '{
    "trafficId": "traffic-uuid-2",
    "content": "Same endpoint works when called 100ms later",
    "color": "green",
    "tags": ["reference", "working"]
  }'

# After fixing, update the annotation
curl -X PUT http://localhost:8889/api/annotations/ann-uuid-1 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Fixed: race condition in database transaction - added mutex",
    "color": "green",
    "tags": ["resolved", "race-condition"]
  }'
```
:::
