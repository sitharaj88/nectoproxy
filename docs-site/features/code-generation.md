---
title: Code Generation
description: Generate ready-to-use code snippets from captured HTTP requests in 8 languages and tools.
---

# Code Generation

NectoProxy can generate **ready-to-use code snippets** from any captured HTTP request. Select a request from the traffic list, choose your target language or tool, and NectoProxy produces a complete, runnable code snippet that reproduces the exact request -- including method, URL, headers, query parameters, and body.

## Supported Languages

NectoProxy supports code generation for **8 languages and tools**, covering the most common development and scripting environments.

### cURL

Command-line HTTP requests using the ubiquitous cURL tool. The generated command includes all necessary flags for method, headers, body, and TLS options.

```bash
curl -X POST 'https://api.example.com/v1/users' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIs...' \
  -H 'Accept: application/json' \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "admin"
  }'
```

::: tip
cURL snippets are the most universally useful format. They can be pasted into any terminal, included in documentation, or used in shell scripts. Most developers are familiar with cURL syntax, making it ideal for bug reports and API documentation.
:::

### Python (requests)

Python code using the popular `requests` library. Generated code handles headers, JSON payloads, query parameters, and cookies.

```python
import requests

url = "https://api.example.com/v1/users"

headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs...",
    "Accept": "application/json"
}

payload = {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "admin"
}

response = requests.post(url, json=payload, headers=headers)

print(response.status_code)
print(response.json())
```

### Node.js (fetch)

JavaScript code using the built-in `fetch` API available in Node.js 18+ and all modern browsers.

```javascript
const response = await fetch('https://api.example.com/v1/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'admin'
  })
});

const data = await response.json();
console.log(data);
```

### Go (net/http)

Go code using the standard library `net/http` package. Generated code includes proper error handling and body reading.

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

func main() {
    payload := map[string]interface{}{
        "name":  "Jane Doe",
        "email": "jane@example.com",
        "role":  "admin",
    }

    body, _ := json.Marshal(payload)

    req, err := http.NewRequest("POST", "https://api.example.com/v1/users", bytes.NewBuffer(body))
    if err != nil {
        panic(err)
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIs...")
    req.Header.Set("Accept", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()

    respBody, _ := io.ReadAll(resp.Body)
    fmt.Println(string(respBody))
}
```

### PHP (cURL extension)

PHP code using the cURL extension, which is available in virtually all PHP installations.

```php
<?php

$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, 'https://api.example.com/v1/users');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer eyJhbGciOiJIUzI1NiIs...',
    'Accept: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'name' => 'Jane Doe',
    'email' => 'jane@example.com',
    'role' => 'admin'
]));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

echo "Status: $httpCode\n";
echo $response;
```

### Rust (reqwest)

Rust code using the `reqwest` crate, the most popular HTTP client library in the Rust ecosystem.

```rust
use reqwest::header::{HeaderMap, HeaderValue, CONTENT_TYPE, ACCEPT, AUTHORIZATION};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(AUTHORIZATION, HeaderValue::from_static("Bearer eyJhbGciOiJIUzI1NiIs..."));
    headers.insert(ACCEPT, HeaderValue::from_static("application/json"));

    let payload = json!({
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "admin"
    });

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.example.com/v1/users")
        .headers(headers)
        .json(&payload)
        .send()
        .await?;

    println!("Status: {}", response.status());
    let body = response.text().await?;
    println!("{}", body);

    Ok(())
}
```

### HTTPie

A user-friendly command-line HTTP client designed for interacting with APIs. HTTPie provides a more intuitive syntax compared to cURL.

```bash
http POST https://api.example.com/v1/users \
  Content-Type:application/json \
  Authorization:'Bearer eyJhbGciOiJIUzI1NiIs...' \
  Accept:application/json \
  name='Jane Doe' \
  email='jane@example.com' \
  role='admin'
```

::: tip
HTTPie is particularly convenient for quick API testing from the terminal. Its syntax is more readable than cURL, with automatic JSON formatting and colorized output.
:::

### PowerShell (Invoke-WebRequest)

PowerShell code using the built-in `Invoke-WebRequest` cmdlet available on Windows, macOS, and Linux.

```powershell
$headers = @{
    "Content-Type"  = "application/json"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIs..."
    "Accept"        = "application/json"
}

$body = @{
    name  = "Jane Doe"
    email = "jane@example.com"
    role  = "admin"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "https://api.example.com/v1/users" `
    -Method POST `
    -Headers $headers `
    -Body $body

Write-Output "Status: $($response.StatusCode)"
Write-Output $response.Content
```

## How to Generate Code

### From the Traffic List

1. **Select a request** in the traffic list by clicking on it
2. Open the **details panel** for the selected request
3. Click the **Code** tab or the **Generate Code** button
4. Select the **target language** from the dropdown menu
5. The code snippet is generated and displayed with syntax highlighting
6. Click **Copy to Clipboard** to copy the snippet

### Context Menu

Right-click on any entry in the traffic list and select **Generate Code** from the context menu. This opens the code generation panel directly with the selected request.

## Features

### Syntax Highlighting

All generated code is displayed with **full syntax highlighting** for the target language. This makes the code easy to read and verify before copying.

### Copy to Clipboard

A single click on the **Copy** button copies the generated code to your system clipboard. A confirmation notification appears when the copy is successful.

### Accurate Reproduction

Generated code includes every detail of the original request:

| Detail | Included |
|---|---|
| HTTP method | Yes |
| Full URL with query parameters | Yes |
| All request headers | Yes |
| Request body | Yes |
| Content-Type handling | Yes (auto-detects JSON, form data, etc.) |
| Cookies | Yes (included in headers) |

::: warning
Generated code includes **all headers** from the original request, including `Authorization` headers, cookies, and session tokens. Review the generated code and remove any sensitive credentials before sharing it or committing it to source control.
:::

## Use Cases

### Reproducing Issues

When a request captured in NectoProxy reveals a bug, generate code to reproduce it outside the browser:

1. Capture the problematic request in NectoProxy
2. Generate a cURL or Python snippet
3. Run the snippet to reproduce the issue independently
4. Share the snippet in a bug report for reproducibility

### Building API Scripts

Turn captured traffic into automation scripts:

1. Interact with an API through your application
2. Capture the requests in NectoProxy
3. Generate code in your preferred language
4. Use the generated code as the starting point for an automation script

### API Documentation

Generate example requests for your API documentation:

1. Make requests to your API through NectoProxy
2. Generate cURL snippets for each endpoint
3. Include them in your API docs as executable examples

### Cross-Language Translation

Need to make the same API call from a different language? Capture the request once and generate code for any language:

1. Capture a working API call
2. Generate code in the original language to verify correctness
3. Generate code in the target language
4. Both snippets produce identical HTTP requests

---

::: info
Code generation works with any captured request, including imported HAR entries and replayed requests.
:::
