# Mocking APIs

**Difficulty:** Beginner | **Time:** 10 minutes

This tutorial walks you through using NectoProxy to mock API endpoints. This is invaluable when building a frontend before the backend is ready, or when you need to test specific response scenarios that are hard to reproduce with a real server.

## Scenario

You are developing a user management frontend. The backend team has documented the API contract, but the endpoints are not deployed yet. You need:

- `GET /api/users` -- Returns a list of users
- `POST /api/users` -- Creates a new user and returns 201
- `GET /api/users/:id` -- Returns a single user
- Error scenarios for testing

## Prerequisites

- NectoProxy installed and running (`nectoproxy start`)
- CA certificate installed in your browser
- Browser configured to use NectoProxy as its proxy (port 8888)

## Step 1: Start NectoProxy

```bash
nectoproxy start
```

The Web UI opens automatically at `http://localhost:8889`.

## Step 2: Open the Rules Panel

In the NectoProxy Web UI header, click the **Rules** button (or use the keyboard shortcut). This opens the Rules panel where you can create, edit, and manage traffic manipulation rules.

## Step 3: Create a Mock Rule for GET /api/users

1. Click **Add Rule** in the Rules panel.
2. Fill in the rule details:

   | Field | Value |
   |-------|-------|
   | **Name** | Mock Users List |
   | **Action** | Mock |
   | **Match URL** | `*/api/users` |
   | **Match Method** | `GET` |

3. In the Mock Response configuration:

   | Field | Value |
   |-------|-------|
   | **Status** | `200` |
   | **Status Text** | `OK` |

4. Add a response header:

   | Header | Value |
   |--------|-------|
   | `Content-Type` | `application/json` |

5. Set the response body:

```json
[
  {
    "id": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "admin"
  },
  {
    "id": 2,
    "name": "Bob Smith",
    "email": "bob@example.com",
    "role": "user"
  },
  {
    "id": 3,
    "name": "Carol Williams",
    "email": "carol@example.com",
    "role": "user"
  }
]
```

6. Click **Save**.

::: tip
The match pattern `*/api/users` uses a wildcard to match any host. This means it will intercept `http://localhost:3000/api/users`, `https://api.example.com/api/users`, or any other host accessing this path.
:::

## Step 4: Create a Mock Rule for POST /api/users

1. Click **Add Rule** again.
2. Fill in:

   | Field | Value |
   |-------|-------|
   | **Name** | Mock Create User |
   | **Action** | Mock |
   | **Match URL** | `*/api/users` |
   | **Match Method** | `POST` |

3. Configure the mock response:

   | Field | Value |
   |-------|-------|
   | **Status** | `201` |
   | **Status Text** | `Created` |

4. Add headers:

   | Header | Value |
   |--------|-------|
   | `Content-Type` | `application/json` |

5. Set the response body:

```json
{
  "id": 4,
  "name": "New User",
  "email": "newuser@example.com",
  "role": "user",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

6. Click **Save**.

## Step 5: Point Your Frontend to the Proxy

Configure your development environment to use NectoProxy as its HTTP proxy. With most frameworks, you can set the proxy environment variable:

```bash
# For curl testing
curl -x http://localhost:8888 http://api.example.com/api/users

# For Node.js applications
HTTP_PROXY=http://localhost:8888 HTTPS_PROXY=http://localhost:8888 npm start

# Or configure your browser's proxy settings to use localhost:8888
```

## Step 6: Test Your Frontend

Open your frontend application in the browser (configured to use the proxy). When your application makes requests to `/api/users`:

- **GET requests** receive the mock user list with status 200.
- **POST requests** receive the mock created user with status 201.

In the NectoProxy Web UI, you will see these requests appear in the traffic list with a **"Mocked"** flag, confirming the rules are active.

## Advanced: Mock Error Responses

### Simulate a 500 Internal Server Error

Create a rule to test how your frontend handles server errors:

| Field | Value |
|-------|-------|
| **Name** | Mock Server Error |
| **Action** | Mock |
| **Match URL** | `*/api/users/error-test` |
| **Status** | `500` |
| **Status Text** | `Internal Server Error` |

Body:

```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong on the server"
}
```

### Simulate Rate Limiting (429)

Test your retry logic:

| Field | Value |
|-------|-------|
| **Name** | Mock Rate Limit |
| **Action** | Mock |
| **Match URL** | `*/api/users` |
| **Match Method** | `GET` |
| **Status** | `429` |
| **Status Text** | `Too Many Requests` |

Headers:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Retry-After` | `30` |

Body:

```json
{
  "error": "Too Many Requests",
  "retryAfter": 30
}
```

::: warning
If you already have a rule matching `GET */api/users` that returns 200, and you create another rule for the same pattern that returns 429, use the **priority** field to control which one fires. Higher priority rules are evaluated first. Alternatively, disable the 200 rule while testing error handling.
:::

### Simulate a Slow API Response

Add a delay to any mock rule to simulate network latency or slow server processing:

1. Create a rule with action **Delay**.
2. Set the match pattern to the URL you want to slow down.
3. Set the delay to the desired number of milliseconds (e.g., `3000` for 3 seconds).

You can also chain a delay with a mock by setting the `delay` field in the mock response configuration. This returns the mock response after the specified delay.

::: details Full Example: Slow Mock Response
Create a Mock rule for `GET */api/users/slow`:

| Field | Value |
|-------|-------|
| **Status** | `200` |
| **Delay** | `5000` (5 seconds) |

This simulates a server that takes 5 seconds to respond -- perfect for testing loading spinners, skeleton screens, and timeout handling.
:::

## Tips and Best Practices

- **Use descriptive rule names.** When you have many rules, clear names like "Mock Users List" or "Mock 500 Error" make it easy to find and toggle them.
- **Toggle rules on and off** instead of deleting them. The enabled/disabled toggle in the Rules panel lets you quickly switch between real and mock responses.
- **Use specific match patterns** to avoid intercepting more traffic than intended. Match on both the URL path and the HTTP method.
- **Check the traffic list** to verify your mocks are being applied. Mocked entries are clearly flagged in the NectoProxy UI.
