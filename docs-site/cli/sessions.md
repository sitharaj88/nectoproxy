# nectoproxy sessions

The `sessions` command manages NectoProxy traffic sessions. Sessions let you organize captured traffic into named groups -- useful for separating debugging sessions, test runs, or different projects.

## Usage

```bash
nectoproxy sessions [options]
```

## Options

| Option | Description |
|---|---|
| *(no flags)* | List all existing sessions |
| `--list` | List all existing sessions (explicit form) |
| `--create <name>` | Create a new session with the given name |
| `--delete <id>` | Delete a session by its ID |

## List Sessions

List all existing sessions with their IDs, names, and creation dates:

```bash
nectoproxy sessions
```

Or use the explicit `--list` flag:

```bash
nectoproxy sessions --list
```

Example output:

```
  Sessions:

  ID    Name                    Created
  ──────────────────────────────────────────────
  1     Default Session         2025-01-15 10:30
  2     API Debugging           2025-01-15 14:22
  3     Mobile App Testing      2025-01-16 09:15
```

If there are no sessions, the output indicates that:

```
  No sessions found. Create one with:
    nectoproxy sessions --create "My Session"
```

::: tip Default Session
NectoProxy automatically creates a default session when it first starts. All captured traffic is associated with the active session. You can switch between sessions in the Web UI.
:::

## Create a Session

Create a new named session:

```bash
nectoproxy sessions --create "API Debugging"
```

Example output:

```
  Session created:
    ID:   2
    Name: API Debugging
```

The new session is created but is not automatically set as the active session. Switch to it through the Web UI or when starting NectoProxy.

### Naming Conventions

Session names can include any characters. Use descriptive names that help you identify the purpose of each session:

```bash
nectoproxy sessions --create "Sprint 42 - Login Flow"
nectoproxy sessions --create "Production Issue #1234"
nectoproxy sessions --create "Performance Testing - 2025-01-15"
```

::: tip Organizing Your Work
Create a new session for each debugging task or test run. This keeps your traffic organized and makes it easy to revisit captured requests later. You can also export individual sessions as HAR files from the Web UI.
:::

## Delete a Session

Delete a session by its numeric ID:

```bash
nectoproxy sessions --delete 2
```

Example output:

```
  Session deleted: API Debugging (ID: 2)
```

::: warning Deleting a Session Is Permanent
Deleting a session removes it and all associated captured traffic from the database. This action cannot be undone. Make sure to export any important traffic as a HAR file before deleting.
:::

To find the ID of the session you want to delete, first list all sessions:

```bash
nectoproxy sessions --list
```

Then delete by ID:

```bash
nectoproxy sessions --delete 3
```

## Examples

### Full Session Workflow

A typical workflow for managing sessions from the command line:

```bash
# List existing sessions
nectoproxy sessions

# Create a new session for today's work
nectoproxy sessions --create "Debug Login API"

# Start NectoProxy (traffic goes to the active session)
nectoproxy start

# ... capture traffic, debug issues ...

# Later, review sessions
nectoproxy sessions --list

# Clean up old sessions
nectoproxy sessions --delete 5
nectoproxy sessions --delete 6
```

### Creating Sessions for Different Environments

```bash
# Set up sessions for different testing scenarios
nectoproxy sessions --create "Staging Environment"
nectoproxy sessions --create "Production Debugging"
nectoproxy sessions --create "Local Development"
```

### Listing and Cleaning Up

```bash
# See all sessions
nectoproxy sessions

# Delete sessions you no longer need
nectoproxy sessions --delete 1
nectoproxy sessions --delete 3
```

## Data Storage

Sessions and their associated traffic data are stored in the NectoProxy SQLite database at:

```
~/.nectoproxy/nectoproxy.db
```

::: details Database Details
NectoProxy uses SQLite with Drizzle ORM for data storage. Each session record contains:
- **ID** -- Auto-incrementing numeric identifier.
- **Name** -- The human-readable session name.
- **Created At** -- Timestamp of when the session was created.

Traffic records (requests and responses) are linked to sessions via a foreign key relationship. Deleting a session cascades to remove all associated traffic records.
:::
