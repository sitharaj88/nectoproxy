---
title: Sessions
description: Organize and manage captured traffic into named sessions in NectoProxy.
---

# Sessions

Sessions let you **organize captured traffic** into separate, named containers. Instead of having all captured traffic in a single, ever-growing list, you can create distinct sessions for different debugging tasks, testing scenarios, or time periods. Switch between sessions without losing data, and export or delete sessions when you are done.

## What is a Session?

A session is a named collection of captured traffic entries. Think of sessions as folders or workspaces for your network traffic:

- Each session has its own traffic list
- Traffic is captured into the **active session**
- You can create, switch, rename, and delete sessions
- Sessions persist across NectoProxy restarts

::: tip
Using sessions keeps your work organized. Instead of scrolling through thousands of unrelated requests to find what you need, create a new session for each debugging task and keep your traffic focused.
:::

## Creating Sessions

### Creating a New Session

1. Click the **Sessions** button in the NectoProxy toolbar
2. Click **New Session**
3. Enter a descriptive name for the session
4. The new session becomes the active session immediately

### Naming Conventions

Choose session names that describe the purpose or context of the captured traffic. Good examples:

| Session Name | Purpose |
|---|---|
| `Login Flow Investigation` | Debugging authentication issues |
| `API v2 Migration Testing` | Comparing old and new API behavior |
| `Performance Baseline 2025-01-15` | Capturing baseline performance metrics |
| `Bug #1234 Reproduction` | Reproducing a specific bug report |
| `Security Review - Checkout` | Security scanning the checkout flow |
| `Mobile App Traffic` | Traffic from a mobile application |

::: details Default Session
When NectoProxy starts, a default session is created automatically. You can rename the default session or create new ones as needed. If you do not create any sessions explicitly, all traffic is captured into the default session.
:::

## Switching Between Sessions

Click on any session in the sessions panel to make it the **active session**. The traffic list immediately updates to show the entries from the selected session.

**Key behaviors when switching:**

- Captured traffic is always added to the **active** session
- Switching sessions does not delete or modify traffic in other sessions
- You can quickly switch back and forth between sessions to compare traffic
- The previously active session's traffic remains intact

::: warning
When you switch to a different session, new traffic is captured into the newly active session. If you need to capture traffic into a specific session, make sure it is the active session before starting your test.
:::

## Active Session Indicator

The currently active session is clearly indicated in the NectoProxy UI:

- The session name is displayed in the toolbar
- The active session is highlighted in the sessions panel
- A visual indicator (such as a dot or bold text) marks the active session in the list

This ensures you always know which session is receiving new traffic.

## Session Statistics

Each session displays summary statistics so you can quickly assess its contents:

| Statistic | Description |
|---|---|
| **Request Count** | Total number of HTTP requests captured in the session |
| **Total Bytes** | Combined size of all request and response bodies in the session |
| **Created** | When the session was created |
| **Last Activity** | When the most recent request was captured |

::: details Example: Sessions Panel View
```
Sessions
========

* Login Flow Investigation        (active)
  42 requests | 1.2 MB | Last: 2 min ago

  API v2 Migration Testing
  187 requests | 15.4 MB | Last: 1 hour ago

  Performance Baseline 2025-01-15
  523 requests | 48.7 MB | Last: Yesterday

  Bug #1234 Reproduction
  12 requests | 340 KB | Last: 3 days ago
```
:::

## Managing Sessions

### Renaming a Session

1. Right-click on the session in the sessions panel
2. Select **Rename**
3. Enter the new name
4. Press Enter to confirm

### Deleting Sessions

1. Right-click on the session
2. Select **Delete Session**
3. Confirm the deletion

::: warning
Deleting a session permanently removes all captured traffic data within it. This action cannot be undone. Export important sessions before deleting them.
:::

You cannot delete the active session if it is the only session. Create a new session first, switch to it, and then delete the old one.

### Clearing a Session

To remove all traffic from a session without deleting the session itself:

1. Make the session active
2. Click **Clear** in the traffic list toolbar
3. The session's traffic list is emptied, but the session remains

This is useful for starting a fresh capture within an existing session.

## Exporting Sessions

Sessions can be exported for archiving, sharing with teammates, or importing into other tools.

### Export as HAR

Export all traffic in a session to a [HAR file](./har-export-import):

1. Right-click on the session
2. Select **Export as HAR**
3. Choose a save location and filename
4. The entire session's traffic is saved as a HAR 1.2 file

### What is Included in Exports

| Data | Included |
|---|---|
| All request/response pairs | Yes |
| Headers and bodies | Yes |
| Timing data | Yes |
| Annotations | Yes |
| Session name and metadata | Yes |

## Practical Workflows

### Workflow 1: Bug Investigation

1. **Create a session** named `Bug #456 Investigation`
2. **Reproduce the bug** while capturing traffic
3. **Annotate** the key requests with your findings
4. **Share** by exporting the session as HAR and attaching it to the bug ticket
5. **Keep the session** until the bug is resolved for reference

### Workflow 2: Before/After Comparison

1. **Create a session** named `Before Deploy v2.5`
2. **Capture traffic** from the current version
3. **Deploy** the new version
4. **Create a new session** named `After Deploy v2.5`
5. **Capture traffic** from the new version
6. **Switch** between sessions to compare behavior
7. Use [Request Comparison](./request-comparison) across sessions

### Workflow 3: Organized Development

Maintain separate sessions for different parts of your development work:

| Session | Purpose |
|---|---|
| `Frontend Dev` | Traffic while developing the frontend |
| `API Testing` | Direct API call testing |
| `Third-Party Integration` | Traffic to/from external services |
| `Performance Profiling` | Measuring response times and payload sizes |

Switch between sessions as you move between tasks throughout the day.

### Workflow 4: Team Collaboration

1. Each team member creates sessions for their work
2. When an issue is found, the session is exported as HAR
3. Other team members import the HAR into their own NectoProxy instance
4. The original annotations and context are preserved

## Session Lifecycle

```
Create Session
     |
     v
Set as Active ----> Capture Traffic
     |                    |
     v                    v
Switch Away         Traffic Stored
     |                    |
     v                    v
Switch Back         Export (HAR)
     |                    |
     v                    v
Clear or Delete     Share with Team
```

## Interaction with Other Features

| Feature | Interaction |
|---|---|
| **Traffic Inspection** | Shows traffic from the active session only |
| **Rules Engine** | Rules apply regardless of which session is active |
| **Breakpoints** | Breakpoints apply regardless of which session is active |
| **Search** | Filter bar searches within the active session; global search can search across all sessions |
| **Dashboard** | Dashboard displays statistics for the active session |
| **Annotations** | Annotations are stored per-entry within their session |
| **HAR Export** | Exports the selected session's traffic |

---

::: info
Sessions are stored locally in NectoProxy's data directory. They persist across proxy restarts and are available until explicitly deleted. Large sessions with many captured entries consume disk space proportional to the amount of captured traffic data.
:::
