# Settings API

The Settings API provides endpoints for reading and updating NectoProxy's configuration. Settings control the proxy port, UI port, body size limits, timeouts, and more.

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings` | Get all settings |
| `GET` | `/api/settings/:key` | Get a specific setting |
| `PUT` | `/api/settings/:key` | Update a specific setting |
| `PUT` | `/api/settings` | Bulk update multiple settings |
| `POST` | `/api/settings/reset` | Reset all settings to defaults |

---

## Get All Settings

```
GET /api/settings
```

Retrieve the complete settings object.

### Example Request

```bash
curl http://localhost:8889/api/settings
```

### Response `200 OK`

```json
{
  "settings": {
    "proxy": {
      "port": 8888,
      "sslPort": 8889,
      "maxBodySize": 10485760,
      "timeout": 30000,
      "keepAlive": true
    },
    "ui": {
      "port": 8889,
      "autoOpen": true,
      "theme": "system",
      "fontSize": 14,
      "maxTrafficDisplay": 10000,
      "autoScroll": true
    },
    "storage": {
      "dataDir": "~/.nectoproxy",
      "maxDatabaseSize": 1073741824,
      "retentionDays": 30,
      "compressOldSessions": true
    },
    "certificates": {
      "caName": "NectoProxy CA",
      "caValidityDays": 3650,
      "certValidityDays": 365,
      "keySize": 2048
    }
  }
}
```

---

## Get Specific Setting

```
GET /api/settings/:key
```

Retrieve the value of a single setting.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `key` | `string` | Setting key (see [available keys](#setting-keys)) |

### Example Request

```bash
curl http://localhost:8889/api/settings/proxy
```

### Response `200 OK`

```json
{
  "key": "proxy",
  "value": {
    "port": 8888,
    "sslPort": 8889,
    "maxBodySize": 10485760,
    "timeout": 30000,
    "keepAlive": true
  }
}
```

---

## Update a Specific Setting

```
PUT /api/settings/:key
```

Update a specific setting value.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `key` | `string` | Setting key to update |

### Request Body

```json
{
  "value": {
    "port": 9090,
    "sslPort": 9091,
    "maxBodySize": 20971520,
    "timeout": 60000,
    "keepAlive": true
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `value` | `any` | Yes | The new value for the setting |

### Example Request

```bash
curl -X PUT http://localhost:8889/api/settings/ui \
  -H "Content-Type: application/json" \
  -d '{"value": {"port": 8889, "autoOpen": false, "theme": "dark", "fontSize": 14, "maxTrafficDisplay": 5000, "autoScroll": true}}'
```

### Response `200 OK`

```json
{
  "key": "ui",
  "value": {
    "port": 8889,
    "autoOpen": false,
    "theme": "dark",
    "fontSize": 14,
    "maxTrafficDisplay": 5000,
    "autoScroll": true
  }
}
```

### Error `400 Bad Request`

```json
{
  "error": "Value is required"
}
```

---

## Bulk Update Settings

```
PUT /api/settings
```

Update multiple settings at once by providing a partial settings object.

### Request Body

```json
{
  "proxy": {
    "timeout": 60000
  },
  "ui": {
    "theme": "dark"
  }
}
```

### Example Request

```bash
curl -X PUT http://localhost:8889/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "proxy": {"timeout": 60000, "maxBodySize": 20971520},
    "ui": {"theme": "dark", "autoScroll": false}
  }'
```

### Response `200 OK`

Returns the complete updated settings object:

```json
{
  "settings": {
    "proxy": {
      "port": 8888,
      "sslPort": 8889,
      "maxBodySize": 20971520,
      "timeout": 60000,
      "keepAlive": true
    },
    "ui": {
      "port": 8889,
      "autoOpen": true,
      "theme": "dark",
      "fontSize": 14,
      "maxTrafficDisplay": 10000,
      "autoScroll": false
    },
    "storage": { "..." },
    "certificates": { "..." }
  }
}
```

---

## Reset Settings to Defaults

```
POST /api/settings/reset
```

Reset all settings to their default values.

### Example Request

```bash
curl -X POST http://localhost:8889/api/settings/reset
```

### Response `200 OK`

Returns the complete settings object with all default values applied:

```json
{
  "settings": {
    "proxy": {
      "port": 8888,
      "sslPort": 8889,
      "maxBodySize": 10485760,
      "timeout": 30000,
      "keepAlive": true
    },
    "ui": {
      "port": 8889,
      "autoOpen": true,
      "theme": "system",
      "fontSize": 14,
      "maxTrafficDisplay": 10000,
      "autoScroll": true
    },
    "storage": {
      "dataDir": "~/.nectoproxy",
      "maxDatabaseSize": 1073741824,
      "retentionDays": 30,
      "compressOldSessions": true
    },
    "certificates": {
      "caName": "NectoProxy CA",
      "caValidityDays": 3650,
      "certValidityDays": 365,
      "keySize": 2048
    }
  }
}
```

::: warning Restart May Be Required
Some settings, such as `proxy.port` and `ui.port`, require a restart of NectoProxy to take effect. Changes to `ui.theme`, `ui.fontSize`, and other cosmetic settings apply immediately.
:::

---

## Setting Keys {#setting-keys}

### Proxy Settings (`proxy`)

| Key | Type | Default | Description |
|---|---|---|---|
| `port` | `number` | `8888` | HTTP proxy listening port |
| `sslPort` | `number` | `8889` | HTTPS/SSL proxy port |
| `maxBodySize` | `number` | `10485760` | Maximum request/response body size in bytes (10 MB) |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `keepAlive` | `boolean` | `true` | Enable HTTP keep-alive connections |

### UI Settings (`ui`)

| Key | Type | Default | Description |
|---|---|---|---|
| `port` | `number` | `8889` | Web UI and API server port |
| `autoOpen` | `boolean` | `true` | Automatically open browser when proxy starts |
| `theme` | `string` | `"system"` | UI theme: `"light"`, `"dark"`, or `"system"` |
| `fontSize` | `number` | `14` | UI font size in pixels |
| `maxTrafficDisplay` | `number` | `10000` | Maximum number of traffic entries displayed in UI |
| `autoScroll` | `boolean` | `true` | Auto-scroll traffic list to newest entries |

### Storage Settings (`storage`)

| Key | Type | Default | Description |
|---|---|---|---|
| `dataDir` | `string` | `"~/.nectoproxy"` | Directory for data storage |
| `maxDatabaseSize` | `number` | `1073741824` | Maximum database size in bytes (1 GB) |
| `retentionDays` | `number` | `30` | Number of days to retain old sessions |
| `compressOldSessions` | `boolean` | `true` | Compress inactive session data |

### Certificate Settings (`certificates`)

| Key | Type | Default | Description |
|---|---|---|---|
| `caName` | `string` | `"NectoProxy CA"` | CA certificate common name |
| `caValidityDays` | `number` | `3650` | CA certificate validity period in days (10 years) |
| `certValidityDays` | `number` | `365` | Domain certificate validity period in days |
| `keySize` | `number` | `2048` | RSA key size in bits for generated certificates |

---

## Example: Configure for Large File Testing

::: details Increase body size and timeout limits

```bash
# Increase max body size to 100 MB and timeout to 2 minutes
curl -X PUT http://localhost:8889/api/settings \
  -H "Content-Type: application/json" \
  -d '{
    "proxy": {
      "maxBodySize": 104857600,
      "timeout": 120000
    }
  }'
```
:::
