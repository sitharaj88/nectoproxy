# Performance

This page covers performance-related issues with NectoProxy and how to resolve them.

## Slow Web UI

**Symptom:** The NectoProxy Web UI feels sluggish, scrolling is choppy, or the interface is unresponsive.

### Too Many Traffic Entries

The most common cause of a slow UI is having too many entries in the traffic list. While the traffic list uses a virtualized renderer that can handle thousands of entries efficiently, extremely large lists (10,000+ entries) can still impact performance, especially on lower-powered machines.

**Solutions:**

1. **Clear old traffic.** Click the **trash icon** in the header toolbar to clear the current session's traffic. This immediately frees memory and improves responsiveness.

2. **Use sessions to organize.** Create new sessions for different debugging tasks instead of capturing everything in one session. Smaller sessions are faster to load and browse.

3. **Pause recording** when you do not need to capture traffic. Click the **pause button** in the header to stop recording while keeping the proxy active.

4. **Filter the traffic list.** Use the filter bar to narrow down the displayed entries. Filtered views render fewer DOM elements and are faster.

::: tip
Start a new session at the beginning of each debugging task. This keeps each session focused and manageable. You can always switch back to older sessions to review historical data.
:::

### Browser Tab Memory

Each traffic entry consumes memory in the browser tab. Large response bodies (images, large JSON payloads) are particularly memory-intensive.

**Solutions:**

- Close and reopen the NectoProxy tab periodically to release accumulated memory.
- Use a dedicated browser profile for NectoProxy so memory from other tabs does not compound.

---

## High Memory Usage

**Symptom:** The NectoProxy process (Node.js) uses a large amount of system memory.

### Large Response Bodies

NectoProxy stores request and response bodies in memory before writing them to the database. Large downloads, images, video, or API responses with massive payloads increase memory usage.

**Solutions:**

1. **Reduce `maxBodySize`.** Lower the maximum captured body size to limit memory consumption per entry:

   ```bash
   # Reduce to 2 MB
   curl -X PUT http://localhost:8889/api/settings/maxBodySize \
     -H "Content-Type: application/json" \
     -d '{"value": 2097152}'
   ```

2. **Use SSL Passthrough** for domains that serve large binary content you do not need to inspect (e.g., CDNs, video streaming, large file downloads):

   In Settings > SSL Passthrough, add domains like:
   ```
   *.cdn.example.com
   *.video.example.com
   ```

3. **Block unnecessary traffic** using Block rules for domains that generate high-volume traffic you do not care about (analytics, tracking, ads).

### Many Concurrent Connections

If your application opens many simultaneous connections, NectoProxy manages all of them concurrently. This is normal but increases memory usage proportionally.

::: tip
Monitor NectoProxy's memory usage with your system's activity monitor. On macOS, use Activity Monitor; on Linux, use `htop` or `top`; on Windows, use Task Manager.
:::

---

## Database Growing Large

**Symptom:** The `~/.nectoproxy/data.db` file is consuming significant disk space.

### Check Database Size

```bash
# Check the file size
ls -lh ~/.nectoproxy/data.db

# On macOS / Linux, human-readable size
du -sh ~/.nectoproxy/data.db
```

### Reduce Database Size

**1. Delete old sessions**

The most effective way to reclaim space. Each session contains all its traffic entries, WebSocket frames, and annotations. Deleting a session cascades to remove all associated data.

```bash
# List sessions to find old ones
nectoproxy sessions --list

# Delete a session
nectoproxy sessions --delete <session-id>
```

Or use the Web UI: open the Sessions panel and delete sessions you no longer need.

**2. Compact the database**

After deleting data, SQLite may not immediately release disk space. Run `VACUUM` to compact:

```bash
sqlite3 ~/.nectoproxy/data.db "VACUUM;"
```

::: warning
`VACUUM` requires temporary disk space equal to the size of the database. Ensure you have sufficient free disk space before running it. Also, stop NectoProxy before running `VACUUM` to avoid locking conflicts.
:::

**3. Reduce `maxBodySize`**

Smaller body size limits mean less data stored per entry. If you are mainly debugging headers and status codes, you can reduce this significantly:

```bash
# Reduce to 1 MB
curl -X PUT http://localhost:8889/api/settings/maxBodySize \
  -H "Content-Type: application/json" \
  -d '{"value": 1048576}'
```

**4. Start fresh**

If you do not need any historical data, delete the database and start over:

```bash
# Stop NectoProxy first
rm ~/.nectoproxy/data.db
nectoproxy start
```

A new empty database is created automatically.

### Recommended Database Size Limits

| Usage Pattern | Expected DB Size | Action |
|--------------|:----------------:|--------|
| Light (few sessions, small payloads) | < 100 MB | No action needed |
| Moderate (daily use, medium payloads) | 100 MB - 500 MB | Delete old sessions periodically |
| Heavy (continuous capture, large payloads) | 500 MB - 1 GB | Reduce maxBodySize, delete sessions weekly |
| Excessive | > 1 GB | VACUUM, review maxBodySize, clean up |

---

## Proxy Adds Latency

**Symptom:** Requests are noticeably slower when going through NectoProxy compared to direct connections.

**Explanation:** Some latency is inherent in any MITM (man-in-the-middle) proxy. For HTTPS connections, NectoProxy performs the following additional operations:

1. Terminates the client's TLS connection.
2. Generates (or retrieves from cache) a certificate for the target domain.
3. Decrypts the request.
4. Establishes a new TLS connection to the target server.
5. Forwards the request.
6. Receives the response.
7. Stores the data in the database.
8. Encrypts and forwards the response to the client.

### Reducing Proxy Latency

**1. Use SSL Passthrough for non-debugged domains**

Domains in the SSL Passthrough list bypass the MITM process entirely. The TLS connection is tunneled directly without decryption, adding minimal latency:

```
*.googleapis.com
*.gstatic.com
*.cloudflare.com
fonts.googleapis.com
```

This is the single most effective way to reduce latency for domains you are not debugging.

**2. Certificate caching**

NectoProxy caches generated domain certificates automatically. The first request to a new domain has slightly higher latency due to certificate generation; subsequent requests use the cached certificate.

**3. Database write performance**

NectoProxy uses SQLite with WAL mode, which provides good concurrent write performance. Database writes happen asynchronously (fire-and-forget) and should not block request processing.

---

## Virtualized List Performance

NectoProxy's traffic list uses a virtualized renderer, which means only the visible rows are rendered in the DOM. This architecture provides good performance even with thousands of entries.

If you experience scrolling issues:

1. **Reduce the number of entries** by using filters or starting a new session.
2. **Avoid extremely wide layouts** that cause horizontal scrolling in the detail panel.
3. **Close the detail panel** when scrolling through the traffic list to reduce rendering load.
4. **Use a modern browser.** Chrome and Edge generally provide the best rendering performance for large lists.
