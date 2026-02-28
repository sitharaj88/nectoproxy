# Certificates API

The Certificates API provides access to NectoProxy's CA (Certificate Authority) certificate, which is used for HTTPS traffic interception. You need to install this CA certificate in your browser or operating system to inspect HTTPS traffic without security warnings.

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/certificates/ca` | Download CA certificate as PEM |
| `GET` | `/api/certificates/download` | Download CA certificate as CRT |
| `GET` | `/api/certificates/ca/info` | Get CA certificate info |
| `GET` | `/api/certificates/ca/install` | Get installation instructions |
| `DELETE` | `/api/certificates/cache` | Clear domain certificate cache |

---

## Download CA Certificate (PEM)

```
GET /api/certificates/ca
```

Download the CA certificate in PEM format. This is the standard format for most systems and tools.

### Example Request

```bash
curl http://localhost:8889/api/certificates/ca -o nectoproxy-ca.pem
```

### Response `200 OK`

```
Content-Type: application/x-pem-file
Content-Disposition: attachment; filename="nectoproxy-ca.pem"
```

The response body contains the PEM-encoded certificate:

```
-----BEGIN CERTIFICATE-----
MIIDxTCCAq2gAwIBAgIUB7...
-----END CERTIFICATE-----
```

---

## Download CA Certificate (CRT)

```
GET /api/certificates/download
```

Download the CA certificate in CRT format. This format has better compatibility with mobile devices and some operating systems.

### Example Request

```bash
curl http://localhost:8889/api/certificates/download -o nectoproxy-ca.crt
```

### Response `200 OK`

```
Content-Type: application/x-x509-ca-cert
Content-Disposition: attachment; filename="nectoproxy-ca.crt"
```

::: tip Mobile Device Installation
For mobile devices, use the CRT download endpoint. On iOS, navigate to `http://<proxy-ip>:8889/api/certificates/download` in Safari. On Android, download the file and install it from Settings > Security > Install certificates.
:::

---

## Get CA Certificate Info

```
GET /api/certificates/ca/info
```

Retrieve metadata about the CA certificate without downloading the full certificate.

### Example Request

```bash
curl http://localhost:8889/api/certificates/ca/info
```

### Response `200 OK`

```json
{
  "fingerprint": "A1:B2:C3:D4:E5:F6:78:90:AB:CD:EF:12:34:56:78:90:A1:B2:C3:D4",
  "path": "/home/user/.nectoproxy/certs/ca.pem"
}
```

| Field | Type | Description |
|---|---|---|
| `fingerprint` | `string` | SHA-1 fingerprint of the CA certificate |
| `path` | `string` | Filesystem path to the CA certificate file |

### Error `404 Not Found`

```json
{
  "error": "CA certificate not found"
}
```

---

## Get Installation Instructions

```
GET /api/certificates/ca/install
```

Retrieve platform-specific instructions for installing the CA certificate.

### Example Request

```bash
curl http://localhost:8889/api/certificates/ca/install
```

### Response `200 OK`

```json
{
  "instructions": {
    "macos": "Open Keychain Access, drag the .pem file into 'System' keychain, then double-click and set 'Always Trust'",
    "windows": "Double-click the .crt file, select 'Install Certificate', choose 'Local Machine', and place in 'Trusted Root Certification Authorities'",
    "linux": "Copy to /usr/local/share/ca-certificates/ and run sudo update-ca-certificates",
    "ios": "Send the .crt to your device via AirDrop or navigate to the download URL in Safari, then go to Settings > General > About > Certificate Trust Settings",
    "android": "Download .crt file, go to Settings > Security > Install certificates, select the downloaded file",
    "firefox": "Go to Preferences > Privacy & Security > Certificates > View Certificates > Import"
  }
}
```

---

## Clear Domain Certificate Cache

```
DELETE /api/certificates/cache
```

Clear the cache of generated domain certificates. NectoProxy generates and caches a certificate for each domain it intercepts. Clearing the cache forces regeneration of these certificates.

### Example Request

```bash
curl -X DELETE http://localhost:8889/api/certificates/cache
```

### Response `200 OK`

```json
{
  "success": true
}
```

::: tip When to Clear Cache
Clear the certificate cache if you:
- Regenerated the CA certificate
- Experience SSL errors with specific domains
- Want to free up disk space used by cached certificates
:::

---

## Certificate Setup Workflow

::: details Complete setup from download to installation

```bash
# 1. Download the CA certificate
curl http://localhost:8889/api/certificates/ca -o nectoproxy-ca.pem

# 2. Check the certificate info
curl http://localhost:8889/api/certificates/ca/info

# 3. Get installation instructions for your platform
curl http://localhost:8889/api/certificates/ca/install

# 4. Install the certificate (example for Linux)
sudo cp nectoproxy-ca.pem /usr/local/share/ca-certificates/nectoproxy-ca.crt
sudo update-ca-certificates

# 5. Verify: make a request through the proxy
curl -x http://localhost:8888 https://example.com
```
:::

::: warning Security Considerations
The CA certificate gives NectoProxy the ability to decrypt all HTTPS traffic. Only install it on development machines. Never install it on production systems or share the CA private key.
:::
