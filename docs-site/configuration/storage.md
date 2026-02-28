# Storage & Database

NectoProxy uses a local SQLite database to persist all captured traffic, rules, breakpoints, sessions, and settings. This page explains the storage architecture, how to manage your data, and how to back up or migrate between machines.

## Data Directory

All NectoProxy data lives in a single directory:

```
~/.nectoproxy/
```

This directory is created automatically the first time NectoProxy starts. It resolves to:

| Platform | Path |
|----------|------|
| **Linux** | `/home/<username>/.nectoproxy/` |
| **macOS** | `/Users/<username>/.nectoproxy/` |
| **Windows** | `C:\Users\<username>\.nectoproxy\` |

### Directory Structure

```
~/.nectoproxy/
  data.db            # SQLite database (all application data)
  certs/
    ca.key            # CA private key (PEM)
    ca.crt            # CA certificate (PEM)
    <domain>.key      # Cached domain private keys
    <domain>.crt      # Cached domain certificates
```

## Database File

The database file is `data.db`, located at `~/.nectoproxy/data.db`. It is a standard SQLite 3 database using WAL (Write-Ahead Logging) mode for better concurrent read/write performance.

::: tip
You can inspect the database with any SQLite client:
```bash
sqlite3 ~/.nectoproxy/data.db
```
:::

### Database Tables

NectoProxy's database schema contains the following tables:

| Table | Purpose |
|-------|---------|
| `sessions` | Capture sessions. Each session groups related traffic entries together. |
| `traffic` | HTTP/HTTPS request-response pairs. Contains method, URL, headers, bodies, status codes, timing data, and metadata flags. |
| `rules` | Rewrite rules (mock, block, delay, throttle, map-remote, map-local, modify-request, modify-response). |
| `breakpoints` | Breakpoint definitions for intercepting requests and responses. |
| `ssl_passthrough` | Domains that bypass MITM interception and pass through the proxy without decryption. |
| `dns_mappings` | Custom DNS mappings that override hostname resolution. |
| `settings` | Key-value store for application settings. |
| `ws_frames` | Individual WebSocket frames (direction, opcode, data, timestamp) linked to a parent traffic entry. |
| `annotations` | User-created notes and tags attached to individual traffic entries. |

### Key Indexes

The database includes indexes on frequently queried columns for fast lookups:

- `idx_traffic_session` -- Traffic entries by session ID
- `idx_traffic_timestamp` -- Traffic entries by capture time
- `idx_traffic_host` -- Traffic entries by host/domain
- `idx_traffic_method` -- Traffic entries by HTTP method
- `idx_traffic_status` -- Traffic entries by response status code
- `idx_ws_frames_traffic` -- WebSocket frames by parent traffic entry
- `idx_annotations_traffic` -- Annotations by parent traffic entry

## Certificate Storage

The `certs/` subdirectory contains the Certificate Authority (CA) key pair and cached domain certificates:

| File | Description |
|------|-------------|
| `ca.key` | The CA private key used to sign domain certificates. Keep this secure. |
| `ca.crt` | The CA certificate. This is the file you install in browsers and on devices. |
| `*.key` / `*.crt` | Cached per-domain certificates generated on-the-fly during HTTPS interception. |

::: danger
The `ca.key` file is a private key. Anyone who has this file can generate certificates that your browser will trust (if you have installed the CA). Do not share it or commit it to version control.
:::

## Backing Up

Backing up NectoProxy is straightforward -- copy the data directory:

### Full Backup

```bash
# Stop NectoProxy first (recommended to avoid WAL checkpoint issues)
# Then copy the entire data directory
cp -r ~/.nectoproxy/ ~/nectoproxy-backup-$(date +%Y%m%d)/
```

### Database-Only Backup

If you only need the traffic data, rules, and settings (not the certificates):

```bash
# Copy just the database file and WAL
cp ~/.nectoproxy/data.db ~/nectoproxy-backup.db
cp ~/.nectoproxy/data.db-wal ~/nectoproxy-backup.db-wal 2>/dev/null
cp ~/.nectoproxy/data.db-shm ~/nectoproxy-backup.db-shm 2>/dev/null
```

::: warning
For a consistent backup, stop NectoProxy before copying the database file. If the proxy is running while you copy, the WAL file (`data.db-wal`) may be in an intermediate state. SQLite's WAL mode is crash-safe, but copying a partial WAL may result in a backup that is missing the most recent writes.
:::

## Restoring

To restore from a backup:

1. Stop NectoProxy if it is running.
2. Replace the data directory (or just the database file) with the backup.
3. Start NectoProxy.

```bash
# Stop NectoProxy (Ctrl+C or kill the process)

# Restore full backup
rm -rf ~/.nectoproxy/
cp -r ~/nectoproxy-backup-20250228/ ~/.nectoproxy/

# Start NectoProxy
nectoproxy start
```

::: tip
If you only restore the database file without the `certs/` directory, NectoProxy will regenerate a new CA certificate on next launch. You will need to reinstall the CA certificate in your browsers and devices.
:::

## Database Size Management

Over time, the database can grow large as traffic data accumulates. Here are strategies to keep it manageable:

### Delete Old Sessions

The most effective way to reduce database size is to delete sessions you no longer need. Each session cascades deletes to all associated traffic entries, WebSocket frames, and annotations.

**Via the Web UI:**
- Open the Sessions panel
- Click the delete button next to sessions you want to remove

**Via the CLI:**
```bash
# List all sessions
nectoproxy sessions --list

# Delete a specific session by ID
nectoproxy sessions --delete <session-id>
```

**Via the API:**
```bash
curl -X DELETE http://localhost:8889/api/sessions/<session-id>
```

### Check Database Size

```bash
# Check file size
ls -lh ~/.nectoproxy/data.db

# Check table sizes inside SQLite
sqlite3 ~/.nectoproxy/data.db "
  SELECT 'traffic' as tbl, count(*) as rows FROM traffic
  UNION ALL
  SELECT 'ws_frames', count(*) FROM ws_frames
  UNION ALL
  SELECT 'sessions', count(*) FROM sessions
  UNION ALL
  SELECT 'annotations', count(*) FROM annotations;
"
```

### Compact the Database

After deleting large amounts of data, SQLite may not immediately reclaim disk space. Run `VACUUM` to compact:

```bash
sqlite3 ~/.nectoproxy/data.db "VACUUM;"
```

::: warning
`VACUUM` temporarily requires up to 2x the current database size in free disk space, as it creates a copy of the database. Make sure you have enough disk space before running it.
:::

## Migrating Between Machines

To move NectoProxy data to another machine:

1. **Stop NectoProxy** on the source machine.
2. **Copy the entire `~/.nectoproxy/` directory** to the target machine:

```bash
# On source machine
tar czf nectoproxy-data.tar.gz ~/.nectoproxy/

# Transfer to target machine (e.g., via scp)
scp nectoproxy-data.tar.gz user@target-machine:~/

# On target machine
cd ~
tar xzf nectoproxy-data.tar.gz
```

3. **Install NectoProxy** on the target machine if not already installed.
4. **Start NectoProxy**. All sessions, traffic, rules, and settings will be available.

::: tip
If you migrate the `certs/` directory along with the database, the CA certificate remains the same. Devices that already trust the old CA will continue to work without reinstalling certificates. If you only migrate the database, a new CA will be generated and you will need to distribute the new certificate.
:::

::: details Can I Use an External SQLite Viewer?
Yes. The `data.db` file is a standard SQLite 3 database. You can open it with any tool that supports SQLite, such as [DB Browser for SQLite](https://sqlitebrowser.org/), the `sqlite3` CLI, or DBeaver. Close NectoProxy first, or open the database in read-only mode to avoid locking conflicts.
:::
