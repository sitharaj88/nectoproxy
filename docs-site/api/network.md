# Network Conditioning API

The Network Conditioning API allows you to simulate various network conditions such as limited bandwidth, latency, jitter, and packet loss. This is useful for testing how your application behaves under constrained network environments like slow mobile connections.

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/network/profiles` | List all profiles (built-in + custom) |
| `GET` | `/api/network/active` | Get the currently active profile |
| `POST` | `/api/network/activate/:id` | Activate a profile |
| `POST` | `/api/network/deactivate` | Deactivate network conditioning |
| `POST` | `/api/network/profiles` | Create a custom profile |
| `PUT` | `/api/network/profiles/:id` | Update a custom profile |
| `DELETE` | `/api/network/profiles/:id` | Delete a custom profile |
| `GET` | `/api/network/local-ips` | Get local IP addresses |

---

## List All Profiles

```
GET /api/network/profiles
```

Returns all available network profiles, including built-in presets and user-created custom profiles, along with the currently active profile.

### Example Request

```bash
curl http://localhost:8889/api/network/profiles
```

### Response `200 OK`

```json
{
  "profiles": [
    {
      "id": "preset-0",
      "name": "No Throttling",
      "description": "Full speed connection",
      "enabled": false,
      "downloadBandwidth": 0,
      "uploadBandwidth": 0,
      "latency": 0,
      "latencyJitter": 0,
      "packetLoss": 0,
      "isPreset": true
    },
    {
      "id": "preset-1",
      "name": "Slow 2G",
      "description": "280 Kbps download, 256 Kbps upload",
      "enabled": false,
      "downloadBandwidth": 35840,
      "uploadBandwidth": 32768,
      "latency": 1400,
      "latencyJitter": 400,
      "packetLoss": 1,
      "isPreset": true
    },
    {
      "id": "custom-uuid-1",
      "name": "My Custom Profile",
      "description": "For testing slow API",
      "enabled": false,
      "downloadBandwidth": 102400,
      "uploadBandwidth": 51200,
      "latency": 500,
      "latencyJitter": 100,
      "packetLoss": 2,
      "isPreset": false
    }
  ],
  "activeProfile": null
}
```

### Built-in Presets

NectoProxy includes the following built-in network presets:

| Name | Download | Upload | Latency | Jitter | Packet Loss |
|---|---|---|---|---|---|
| No Throttling | Unlimited | Unlimited | 0ms | 0ms | 0% |
| Slow 2G | 280 Kbps | 256 Kbps | 1400ms | 400ms | 1% |
| Regular 2G | 450 Kbps | 150 Kbps | 800ms | 200ms | 0.5% |
| Good 2G | 900 Kbps | 280 Kbps | 650ms | 150ms | 0.2% |
| Slow 3G | 780 Kbps | 330 Kbps | 400ms | 100ms | 0% |
| Regular 3G | 1.5 Mbps | 750 Kbps | 300ms | 100ms | 0% |
| Good 3G | 4 Mbps | 1.5 Mbps | 170ms | 40ms | 0% |
| Regular 4G | 9 Mbps | 4 Mbps | 50ms | 10ms | 0% |
| DSL | 2 Mbps | 1 Mbps | 50ms | 10ms | 0% |
| WiFi | 30 Mbps | 15 Mbps | 10ms | 5ms | 0% |
| Offline | ~0 | ~0 | 30000ms | 0ms | 100% |

---

## Get Active Profile

```
GET /api/network/active
```

Returns the currently active network conditioning profile, or `null` if no conditioning is active.

### Example Request

```bash
curl http://localhost:8889/api/network/active
```

### Response `200 OK`

```json
{
  "activeProfile": {
    "id": "preset-4",
    "name": "Slow 3G",
    "description": "780 Kbps download, 330 Kbps upload",
    "enabled": true,
    "downloadBandwidth": 99328,
    "uploadBandwidth": 41984,
    "latency": 400,
    "latencyJitter": 100,
    "packetLoss": 0,
    "isPreset": true
  }
}
```

When no profile is active:

```json
{
  "activeProfile": null
}
```

---

## Activate a Profile

```
POST /api/network/activate/:id
```

Activate a network conditioning profile. Only one profile can be active at a time.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Profile ID (e.g., `preset-4` or a custom profile UUID) |

### Example Request

```bash
curl -X POST http://localhost:8889/api/network/activate/preset-4
```

### Response `200 OK`

```json
{
  "activeProfile": {
    "id": "preset-4",
    "name": "Slow 3G",
    "enabled": true,
    "downloadBandwidth": 99328,
    "uploadBandwidth": 41984,
    "latency": 400,
    "latencyJitter": 100,
    "packetLoss": 0,
    "isPreset": true
  }
}
```

### Error `404 Not Found`

```json
{
  "error": "Profile not found"
}
```

::: warning Impact on Traffic
Activating a network profile immediately affects all traffic flowing through the proxy. All subsequent requests and responses will be subject to the configured bandwidth, latency, and packet loss constraints.
:::

---

## Deactivate Conditioning

```
POST /api/network/deactivate
```

Disable all network conditioning and return to full-speed operation.

### Example Request

```bash
curl -X POST http://localhost:8889/api/network/deactivate
```

### Response `200 OK`

```json
{
  "activeProfile": null
}
```

---

## Create Custom Profile

```
POST /api/network/profiles
```

Create a custom network conditioning profile with specific parameters.

### Request Body

```json
{
  "name": "Satellite Connection",
  "description": "High latency, moderate bandwidth",
  "downloadBandwidth": 512000,
  "uploadBandwidth": 128000,
  "latency": 600,
  "latencyJitter": 50,
  "packetLoss": 0.5
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Profile name |
| `description` | `string` | No | Human-readable description |
| `downloadBandwidth` | `number` | No | Download speed in bytes per second (0 = unlimited) |
| `uploadBandwidth` | `number` | No | Upload speed in bytes per second (0 = unlimited) |
| `latency` | `number` | No | Base latency in milliseconds |
| `latencyJitter` | `number` | No | Latency variation in milliseconds |
| `packetLoss` | `number` | No | Packet loss percentage (0-100) |

### Example Request

```bash
curl -X POST http://localhost:8889/api/network/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Flaky Mobile",
    "description": "Simulates unstable mobile network",
    "downloadBandwidth": 256000,
    "uploadBandwidth": 64000,
    "latency": 300,
    "latencyJitter": 200,
    "packetLoss": 5
  }'
```

### Response `200 OK`

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Flaky Mobile",
  "description": "Simulates unstable mobile network",
  "enabled": false,
  "downloadBandwidth": 256000,
  "uploadBandwidth": 64000,
  "latency": 300,
  "latencyJitter": 200,
  "packetLoss": 5,
  "isPreset": false
}
```

### Error `400 Bad Request`

```json
{
  "error": "Profile name is required"
}
```

---

## Update Custom Profile

```
PUT /api/network/profiles/:id
```

Update parameters of a custom profile. Built-in presets cannot be modified.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Custom profile ID |

### Request Body

```json
{
  "latency": 800,
  "packetLoss": 10
}
```

### Example Request

```bash
curl -X PUT http://localhost:8889/api/network/profiles/custom-uuid-1 \
  -H "Content-Type: application/json" \
  -d '{"latency": 800, "packetLoss": 10}'
```

### Response `200 OK`

Returns the updated profile object.

### Error `404 Not Found`

```json
{
  "error": "Profile not found or is a preset"
}
```

---

## Delete Custom Profile

```
DELETE /api/network/profiles/:id
```

Delete a custom profile. Built-in presets cannot be deleted. If the deleted profile was active, conditioning is automatically deactivated.

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `string` | Custom profile ID |

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/network/profiles/custom-uuid-1
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
  "error": "Profile not found or is a preset"
}
```

---

## Get Local IP Addresses

```
GET /api/network/local-ips
```

Returns the local machine's network interface addresses. This is useful when configuring mobile devices to use NectoProxy as their proxy server.

### Example Request

```bash
curl http://localhost:8889/api/network/local-ips
```

### Response `200 OK`

```json
{
  "addresses": [
    {
      "name": "en0",
      "address": "192.168.1.42",
      "family": "IPv4"
    },
    {
      "name": "eth0",
      "address": "10.0.0.15",
      "family": "IPv4"
    }
  ]
}
```

::: tip Mobile Device Setup
Use the IP addresses returned by this endpoint to configure your mobile device's proxy settings. Point the device to the displayed IP address on the proxy port (default: `8888`).
:::

---

## Network Profile Schema

::: details Full NetworkProfile Schema
| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (e.g., `preset-0` or a UUID) |
| `name` | `string` | Profile name |
| `description` | `string` | Human-readable description |
| `enabled` | `boolean` | Whether this is the currently active profile |
| `downloadBandwidth` | `number` | Download bandwidth in bytes per second (0 = unlimited) |
| `uploadBandwidth` | `number` | Upload bandwidth in bytes per second (0 = unlimited) |
| `latency` | `number` | Base latency added to each request in milliseconds |
| `latencyJitter` | `number` | Random variation applied to latency in milliseconds |
| `packetLoss` | `number` | Percentage of packets dropped (0-100) |
| `isPreset` | `boolean` | Whether this is a built-in preset |
:::
