---
title: Security Scanning
description: Automated security analysis of HTTP traffic for common vulnerabilities and misconfigurations.
---

# Security Scanning

NectoProxy includes **automated security scanning** that analyzes captured HTTP traffic for common security vulnerabilities, misconfigurations, and best-practice violations. Four built-in scanners check for missing security headers, insecure cookies, overly permissive CORS configurations, and information disclosure risks.

## Overview

Security scanning runs against captured traffic entries and produces findings with severity levels and actionable remediation guidance. Scanning can be triggered manually on selected entries or run automatically as traffic flows through the proxy.

Each finding includes:

- **Category** -- Which scanner identified the issue
- **Severity level** -- How critical the finding is
- **Description** -- What the issue is
- **Remediation** -- How to fix it
- **Affected request/response** -- Which traffic entry triggered the finding

## Severity Levels

Findings are classified into five severity levels:

| Level | Color | Description |
|---|---|---|
| **Critical** | Red | Severe vulnerability that could lead to data breach or system compromise |
| **High** | Orange | Significant security weakness requiring prompt attention |
| **Medium** | Yellow | Moderate risk that should be addressed in the normal development cycle |
| **Low** | Blue | Minor issue or hardening opportunity |
| **Info** | Gray | Informational observation, not necessarily a vulnerability |

---

## Scanner Types

### 1. Header Scanner

The Header Scanner checks HTTP responses for **missing or misconfigured security headers**. These headers instruct browsers to enable built-in security mechanisms that protect against common attack vectors.

#### Checked Headers

##### Content-Security-Policy (CSP)

| Aspect | Details |
|---|---|
| **Purpose** | Mitigates Cross-Site Scripting (XSS) and data injection attacks by restricting content sources |
| **Severity when missing** | High |
| **Example value** | `default-src 'self'; script-src 'self' https://cdn.example.com; style-src 'self' 'unsafe-inline'` |

::: details Remediation
Add a `Content-Security-Policy` header to your responses. Start with a restrictive policy and gradually relax it as needed:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'
```

Avoid using `unsafe-inline` and `unsafe-eval` unless absolutely necessary. Use nonce-based or hash-based CSP for inline scripts.
:::

##### X-Frame-Options

| Aspect | Details |
|---|---|
| **Purpose** | Prevents clickjacking by controlling whether the page can be embedded in frames |
| **Severity when missing** | Medium |
| **Valid values** | `DENY`, `SAMEORIGIN` |

::: details Remediation
Add the header to prevent your pages from being embedded in malicious frames:

```
X-Frame-Options: DENY
```

Or, if your site uses iframes for its own content:

```
X-Frame-Options: SAMEORIGIN
```

Note: The `Content-Security-Policy` header's `frame-ancestors` directive is the modern replacement for `X-Frame-Options`.
:::

##### X-Content-Type-Options

| Aspect | Details |
|---|---|
| **Purpose** | Prevents browsers from MIME-type sniffing, which can lead to XSS |
| **Severity when missing** | Medium |
| **Valid values** | `nosniff` |

::: details Remediation
Add this header to all responses:

```
X-Content-Type-Options: nosniff
```

This tells browsers to strictly follow the declared `Content-Type` and not attempt to infer the type from the content.
:::

##### Strict-Transport-Security (HSTS)

| Aspect | Details |
|---|---|
| **Purpose** | Forces browsers to use HTTPS for all future requests to the domain |
| **Severity when missing** | High |
| **Example value** | `max-age=31536000; includeSubDomains; preload` |

::: details Remediation
Add the HSTS header to enforce HTTPS:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

The `max-age` value is in seconds (31536000 = 1 year). Consider adding `includeSubDomains` to protect all subdomains and `preload` if you want to submit your domain to the browser HSTS preload list.

**Warning:** Only enable HSTS after you are confident that your site works correctly over HTTPS. Once enabled, browsers will refuse to connect over HTTP for the specified duration.
:::

##### X-XSS-Protection

| Aspect | Details |
|---|---|
| **Purpose** | Enables the browser's built-in XSS filter (legacy) |
| **Severity when missing** | Low |
| **Recommended value** | `0` (disable) or `1; mode=block` |

::: details Remediation
Modern browsers have deprecated this feature in favor of CSP. The recommended approach is:

```
X-XSS-Protection: 0
```

If CSP is not yet implemented, use:

```
X-XSS-Protection: 1; mode=block
```

The `mode=block` directive tells the browser to block the page entirely rather than attempting to sanitize the reflected XSS.
:::

##### Referrer-Policy

| Aspect | Details |
|---|---|
| **Purpose** | Controls how much referrer information is shared when navigating away from the page |
| **Severity when missing** | Low |
| **Recommended value** | `strict-origin-when-cross-origin` or `no-referrer` |

::: details Remediation
Add a referrer policy that limits information leakage:

```
Referrer-Policy: strict-origin-when-cross-origin
```

This sends the full URL as referrer for same-origin requests, but only the origin (no path) for cross-origin requests. For maximum privacy:

```
Referrer-Policy: no-referrer
```
:::

##### Permissions-Policy

| Aspect | Details |
|---|---|
| **Purpose** | Controls which browser features (camera, microphone, geolocation, etc.) can be used |
| **Severity when missing** | Low |
| **Example value** | `camera=(), microphone=(), geolocation=()` |

::: details Remediation
Restrict access to powerful browser features:

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

This disables camera, microphone, geolocation, and payment API access. Add only the permissions your application actually needs:

```
Permissions-Policy: camera=(self), microphone=(), geolocation=(self "https://maps.example.com")
```
:::

---

### 2. Cookie Scanner

The Cookie Scanner analyzes `Set-Cookie` response headers for **missing security flags** that can leave cookies vulnerable to interception or misuse.

#### Checked Flags

##### HttpOnly

| Aspect | Details |
|---|---|
| **Purpose** | Prevents JavaScript from accessing the cookie, mitigating XSS-based cookie theft |
| **Severity when missing** | High (for session cookies), Medium (for other cookies) |

::: warning
Session cookies without `HttpOnly` can be stolen by XSS attacks using `document.cookie`. Always set `HttpOnly` on authentication and session cookies.
:::

##### Secure

| Aspect | Details |
|---|---|
| **Purpose** | Ensures the cookie is only sent over HTTPS connections |
| **Severity when missing** | High (for session cookies), Medium (for other cookies) |

A cookie without the `Secure` flag can be transmitted over unencrypted HTTP connections, allowing network attackers to intercept it.

##### SameSite

| Aspect | Details |
|---|---|
| **Purpose** | Controls whether the cookie is sent with cross-site requests, mitigating CSRF attacks |
| **Severity when missing** | Medium |
| **Valid values** | `Strict`, `Lax`, `None` |

::: details SameSite Values Explained
- **`Strict`** -- Cookie is never sent with cross-site requests. Best for sensitive cookies.
- **`Lax`** -- Cookie is sent with top-level navigations (clicking a link) but not with embedded requests (images, iframes, AJAX). Good default.
- **`None`** -- Cookie is sent with all requests, including cross-site. Requires the `Secure` flag.

```
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax
```
:::

::: details Example: Insecure Cookie Finding
```
Finding: Session cookie missing security flags
Severity: High
Cookie: session=abc123; Path=/

Issues:
  - Missing HttpOnly flag (cookie accessible to JavaScript)
  - Missing Secure flag (cookie sent over HTTP)
  - Missing SameSite flag (vulnerable to CSRF)

Remediation:
  Set-Cookie: session=abc123; Path=/; HttpOnly; Secure; SameSite=Lax
```
:::

---

### 3. CORS Scanner

The CORS Scanner checks `Access-Control-*` response headers for **overly permissive cross-origin configurations** that could allow unauthorized access to APIs.

#### Checked Configurations

##### Wildcard Origin with Credentials

| Finding | Severity |
|---|---|
| `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` | Critical |

This configuration is forbidden by the CORS specification. Browsers reject it, but its presence indicates a fundamental misunderstanding of CORS security.

##### Reflecting Arbitrary Origins

| Finding | Severity |
|---|---|
| Server reflects any `Origin` header value in `Access-Control-Allow-Origin` | High |

If the server blindly reflects the `Origin` header value, any website can make credentialed cross-origin requests to the API.

::: details How NectoProxy Detects This
NectoProxy checks if the `Access-Control-Allow-Origin` response header matches the `Origin` request header exactly. If multiple requests from different origins all have their origin reflected, the scanner flags this as a potential issue.
:::

##### Overly Permissive Wildcard

| Finding | Severity |
|---|---|
| `Access-Control-Allow-Origin: *` (without credentials) | Info |

A wildcard origin without credentials is technically safe for public APIs, but the scanner notes it as an informational finding in case it was unintentional.

##### Credential Issues

| Finding | Severity |
|---|---|
| `Access-Control-Allow-Credentials: true` without proper origin validation | High |

When credentials are allowed, the `Access-Control-Allow-Origin` header must specify an exact origin (not a wildcard). The scanner verifies this constraint.

---

### 4. Information Disclosure Scanner

The Information Disclosure Scanner checks for **leaked technical details** in responses that could help an attacker understand the server's technology stack and find vulnerabilities.

#### Checked Disclosures

##### Server Version Headers

| Finding | Severity |
|---|---|
| `Server: Apache/2.4.51 (Ubuntu)` | Medium |
| `X-Powered-By: Express` | Medium |
| `X-AspNet-Version: 4.0.30319` | Medium |

Detailed server version information helps attackers identify known vulnerabilities for that specific version.

::: details Remediation
Remove or generalize version information from response headers:

```
# Instead of:
Server: Apache/2.4.51 (Ubuntu)

# Use:
Server: Apache
# Or remove the header entirely
```

For Express.js applications:
```javascript
app.disable('x-powered-by');
```
:::

##### Stack Traces in Responses

| Finding | Severity |
|---|---|
| Response body contains a stack trace | High |

Stack traces in responses reveal internal code structure, file paths, library versions, and potentially sensitive configuration details.

The scanner detects common stack trace patterns:
- Java: `at com.example.Class.method(File.java:42)`
- Python: `File "/app/module.py", line 42, in function`
- Node.js: `at Object.<anonymous> (/app/server.js:42:13)`
- PHP: `#0 /var/www/app.php(42): function()`
- .NET: `at Namespace.Class.Method() in /path/File.cs:line 42`

##### Debug Information

| Finding | Severity |
|---|---|
| Response contains debug headers or body content | Medium |

The scanner checks for:
- `X-Debug-*` headers in production responses
- Debug mode indicators in response bodies
- Verbose error messages with internal details
- Database query details in error responses

---

## Scanning Results

### Results Panel

Scan results are displayed in a dedicated panel showing:

1. **Summary** -- Total findings by severity level
2. **Finding list** -- Each finding with category, severity, description, and affected entry
3. **Detail view** -- Click a finding to see the full description, evidence, and remediation

### Example Summary

```
Security Scan Results
=====================
Critical:  1  (CORS wildcard with credentials)
High:      3  (Missing CSP, HttpOnly, stack trace)
Medium:    5  (Missing X-Frame-Options, server version, ...)
Low:       4  (Missing Referrer-Policy, X-XSS-Protection, ...)
Info:      2  (Wildcard CORS, technology detection)

Total:    15 findings across 8 traffic entries
```

## Practical Workflow

### Scanning Your Application

1. Configure your browser or application to use NectoProxy
2. Navigate through your application, exercising key functionality
3. Open the **Security Scan** panel
4. Click **Scan All** to analyze all captured traffic (or select specific entries)
5. Review findings, starting with Critical and High severity
6. Use the remediation guidance to fix each issue
7. Re-test to verify the fixes are in place

::: tip
Run security scans regularly during development, not just before release. Finding and fixing security issues early is significantly cheaper and less risky than fixing them in production.
:::

### Integrating into Development Workflow

1. **During development** -- Run scans periodically to catch security regressions
2. **Before code review** -- Include scan results in pull request descriptions
3. **Pre-deployment** -- Run a final scan against the staging environment
4. **Post-deployment** -- Verify that production responses include all expected security headers

---

::: warning Limitations
NectoProxy's security scanner checks for common, well-known security misconfigurations. It is not a replacement for a comprehensive security audit, penetration testing, or a dedicated web application security scanner. Use it as a first line of defense to catch low-hanging fruit.
:::
