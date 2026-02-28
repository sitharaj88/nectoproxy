import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { TrafficRepository, SessionRepository } from '@proxyscope/storage';

const router: RouterType = Router();
const trafficRepo = new TrafficRepository();
const sessionRepo = new SessionRepository();

// GET /api/snapshot/:sessionId - Generate and download an HTML snapshot
router.get('/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await sessionRepo.findById(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const entries = await trafficRepo.findBySession(req.params.sessionId, 10000);

    // Serialize entries (convert buffers to base64)
    const serializedEntries = entries.map((entry) => ({
      ...entry,
      requestBody: entry.requestBody?.toString('base64') || null,
      responseBody: entry.responseBody?.toString('base64') || null,
    }));

    const html = generateSnapshotHTML(session, serializedEntries);

    const filename = `proxyscope-${session.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.html`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(html);
  } catch (err) {
    console.error('Error generating snapshot:', err);
    res.status(500).json({ error: 'Failed to generate snapshot' });
  }
});

// POST /api/snapshot/selected - Generate snapshot for selected entries
router.post('/selected', async (req: Request, res: Response): Promise<void> => {
  try {
    const { entryIds, sessionName } = req.body as { entryIds: string[]; sessionName?: string };

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      res.status(400).json({ error: 'entryIds must be a non-empty array' });
      return;
    }

    // Get entries by IDs
    const entries = await Promise.all(
      entryIds.map((id) => trafficRepo.findById(id))
    );

    // Filter out null entries
    const validEntries = entries.filter((e) => e !== null);

    if (validEntries.length === 0) {
      res.status(404).json({ error: 'No valid entries found' });
      return;
    }

    const serializedEntries = validEntries.map((entry) => ({
      ...entry,
      requestBody: entry.requestBody?.toString('base64') || null,
      responseBody: entry.responseBody?.toString('base64') || null,
    }));

    const name = sessionName || 'Selected Requests';
    const html = generateSnapshotHTML({ name }, serializedEntries);

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="proxyscope-snapshot-${Date.now()}.html"`);
    res.send(html);
  } catch (err) {
    console.error('Error generating snapshot:', err);
    res.status(500).json({ error: 'Failed to generate snapshot' });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateSnapshotHTML(session: { name: string }, entries: unknown[]): string {
  const escapedName = escapeHtml(session.name);
  const entriesJson = JSON.stringify(entries)
    .replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ProxyScope - ${escapedName}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #111827; color: #d1d5db; }
.header { background: #1f2937; padding: 16px 24px; border-bottom: 1px solid #374151; display: flex; justify-content: space-between; align-items: center; }
.header h1 { font-size: 18px; color: white; }
.header .meta { font-size: 13px; color: #9ca3af; }
.container { display: flex; height: calc(100vh - 89px); }
.traffic-list { width: 420px; min-width: 300px; overflow-y: auto; border-right: 1px solid #374151; display: flex; flex-direction: column; }
.search { padding: 8px 12px; border-bottom: 1px solid #374151; }
.search input { width: 100%; padding: 6px 12px; background: #374151; border: 1px solid #4b5563; border-radius: 4px; color: white; font-size: 13px; outline: none; }
.search input:focus { border-color: #60a5fa; }
.entries-list { flex: 1; overflow-y: auto; }
.traffic-item { padding: 8px 16px; border-bottom: 1px solid #1f2937; cursor: pointer; font-size: 13px; }
.traffic-item:hover { background: #1f2937; }
.traffic-item.selected { background: #1e3a5f; }
.traffic-item .row { display: flex; align-items: center; gap: 8px; }
.method { font-weight: 600; font-size: 12px; }
.method-get { color: #34d399; }
.method-post { color: #60a5fa; }
.method-put { color: #fbbf24; }
.method-patch { color: #a78bfa; }
.method-delete { color: #f87171; }
.method-options { color: #9ca3af; }
.method-head { color: #9ca3af; }
.status { font-size: 12px; margin-left: auto; }
.status-2xx { color: #34d399; }
.status-3xx { color: #60a5fa; }
.status-4xx { color: #fbbf24; }
.status-5xx { color: #f87171; }
.status-pending { color: #6b7280; }
.duration { font-size: 11px; color: #6b7280; margin-left: 8px; }
.url { color: #9ca3af; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
.detail { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.detail-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280; font-size: 14px; }
.tabs { display: flex; border-bottom: 1px solid #374151; background: #1f2937; flex-shrink: 0; }
.tab { padding: 8px 16px; font-size: 13px; cursor: pointer; color: #9ca3af; border-bottom: 2px solid transparent; user-select: none; }
.tab:hover { color: #d1d5db; }
.tab.active { color: #60a5fa; border-bottom-color: #60a5fa; }
.tab-content { padding: 16px; overflow-y: auto; flex: 1; }
.tab-content.hidden { display: none; }
.section-title { font-size: 14px; color: white; margin-bottom: 8px; font-weight: 600; }
.section-title:not(:first-child) { margin-top: 16px; }
pre { background: #1f2937; padding: 12px; border-radius: 6px; font-size: 13px; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; white-space: pre-wrap; word-break: break-all; overflow-x: auto; color: #d1d5db; line-height: 1.5; }
.header-row { display: flex; gap: 4px; }
.header-name { color: #60a5fa; }
.header-value { color: #d1d5db; }
.footer { padding: 8px 16px; background: #1f2937; border-top: 1px solid #374151; font-size: 11px; color: #6b7280; text-align: center; }
.count-badge { background: #374151; color: #9ca3af; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 8px; }
.no-results { padding: 24px; text-align: center; color: #6b7280; font-size: 13px; }
</style>
</head>
<body>
<div class="header">
  <h1>ProxyScope Snapshot: ${escapedName}</h1>
  <div class="meta">${entries.length} requests | Generated ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</div>
</div>
<div class="container">
  <div class="traffic-list">
    <div class="search"><input type="text" id="search" placeholder="Filter requests..." /></div>
    <div class="entries-list" id="entries-list"></div>
  </div>
  <div class="detail" id="detail">
    <div class="detail-empty">Select a request to view details</div>
  </div>
</div>
<div class="footer">Generated by ProxyScope</div>
<script>
var ENTRIES = ${entriesJson};
var selectedIndex = -1;
var currentTab = 'headers';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function decodeBase64(str) {
  if (!str) return '';
  try {
    var binStr = atob(str);
    var bytes = new Uint8Array(binStr.length);
    for (var i = 0; i < binStr.length; i++) {
      bytes[i] = binStr.charCodeAt(i);
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch (e) {
    return str;
  }
}

function formatDuration(ms) {
  if (ms == null) return '';
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

function formatSize(bytes) {
  if (bytes == null || bytes === 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getStatusClass(status) {
  if (!status) return 'status-pending';
  var cat = Math.floor(status / 100);
  if (cat === 2) return 'status-2xx';
  if (cat === 3) return 'status-3xx';
  if (cat === 4) return 'status-4xx';
  if (cat === 5) return 'status-5xx';
  return '';
}

function getMethodClass(method) {
  return 'method-' + method.toLowerCase();
}

function renderList(filter) {
  var list = document.getElementById('entries-list');
  var html = '';
  var filterLower = filter ? filter.toLowerCase() : '';
  var count = 0;

  for (var i = 0; i < ENTRIES.length; i++) {
    var entry = ENTRIES[i];
    if (filterLower && entry.url.toLowerCase().indexOf(filterLower) === -1 &&
        entry.method.toLowerCase().indexOf(filterLower) === -1 &&
        (entry.host || '').toLowerCase().indexOf(filterLower) === -1) {
      continue;
    }
    count++;
    var sel = (i === selectedIndex) ? ' selected' : '';
    var statusText = entry.status ? entry.status : 'pending';
    var statusCls = getStatusClass(entry.status);
    var methodCls = getMethodClass(entry.method);
    var dur = entry.duration ? formatDuration(entry.duration) : '';

    html += '<div class="traffic-item' + sel + '" data-index="' + i + '">'
      + '<div class="row">'
      + '<span class="method ' + methodCls + '">' + escapeHtml(entry.method) + '</span>'
      + '<span class="status ' + statusCls + '">' + statusText + '</span>'
      + (dur ? '<span class="duration">' + dur + '</span>' : '')
      + '</div>'
      + '<div class="url">' + escapeHtml(entry.url) + '</div>'
      + '</div>';
  }

  if (count === 0) {
    html = '<div class="no-results">No matching requests</div>';
  }

  list.innerHTML = html;
}

function selectEntry(index) {
  selectedIndex = index;
  var filter = document.getElementById('search').value;
  renderList(filter);
  currentTab = 'headers';
  renderDetail(ENTRIES[index]);
}

function renderHeaders(entry) {
  var html = '<h3 class="section-title">General</h3><pre>';
  html += '<div class="header-row"><span class="header-name">URL:</span> <span class="header-value">' + escapeHtml(entry.url) + '</span></div>';
  html += '<div class="header-row"><span class="header-name">Method:</span> <span class="header-value">' + escapeHtml(entry.method) + '</span></div>';
  html += '<div class="header-row"><span class="header-name">Status:</span> <span class="header-value">' + (entry.status || 'pending') + ' ' + escapeHtml(entry.statusText || '') + '</span></div>';
  html += '<div class="header-row"><span class="header-name">Protocol:</span> <span class="header-value">' + escapeHtml(entry.protocol || '') + '</span></div>';
  if (entry.remoteAddress) {
    html += '<div class="header-row"><span class="header-name">Remote Address:</span> <span class="header-value">' + escapeHtml(entry.remoteAddress) + '</span></div>';
  }
  if (entry.duration != null) {
    html += '<div class="header-row"><span class="header-name">Duration:</span> <span class="header-value">' + formatDuration(entry.duration) + '</span></div>';
  }
  if (entry.requestBodySize) {
    html += '<div class="header-row"><span class="header-name">Request Size:</span> <span class="header-value">' + formatSize(entry.requestBodySize) + '</span></div>';
  }
  if (entry.responseBodySize) {
    html += '<div class="header-row"><span class="header-name">Response Size:</span> <span class="header-value">' + formatSize(entry.responseBodySize) + '</span></div>';
  }
  html += '</pre>';

  if (entry.requestHeaders && Object.keys(entry.requestHeaders).length > 0) {
    html += '<h3 class="section-title">Request Headers</h3><pre>';
    var reqKeys = Object.keys(entry.requestHeaders);
    for (var i = 0; i < reqKeys.length; i++) {
      var k = reqKeys[i];
      var v = entry.requestHeaders[k];
      var val = Array.isArray(v) ? v.join(', ') : v;
      html += '<div class="header-row"><span class="header-name">' + escapeHtml(k) + ':</span> <span class="header-value">' + escapeHtml(val) + '</span></div>';
    }
    html += '</pre>';
  }

  if (entry.responseHeaders && Object.keys(entry.responseHeaders).length > 0) {
    html += '<h3 class="section-title">Response Headers</h3><pre>';
    var resKeys = Object.keys(entry.responseHeaders);
    for (var j = 0; j < resKeys.length; j++) {
      var k2 = resKeys[j];
      var v2 = entry.responseHeaders[k2];
      var val2 = Array.isArray(v2) ? v2.join(', ') : v2;
      html += '<div class="header-row"><span class="header-name">' + escapeHtml(k2) + ':</span> <span class="header-value">' + escapeHtml(val2) + '</span></div>';
    }
    html += '</pre>';
  }

  return html;
}

function getContentType(headers) {
  if (!headers) return '';
  var ct = headers['content-type'] || headers['Content-Type'] || '';
  if (Array.isArray(ct)) ct = ct[0] || '';
  return ct.toLowerCase();
}

function formatBody(body, headers) {
  if (!body) return '<pre>(empty)</pre>';
  var ct = getContentType(headers);
  if (ct.indexOf('json') !== -1) {
    try {
      var parsed = JSON.parse(body);
      return '<pre>' + escapeHtml(JSON.stringify(parsed, null, 2)) + '</pre>';
    } catch (e) { /* fallthrough */ }
  }
  return '<pre>' + escapeHtml(body) + '</pre>';
}

function renderDetail(entry) {
  var detail = document.getElementById('detail');
  var reqBody = decodeBase64(entry.requestBody);
  var resBody = decodeBase64(entry.responseBody);

  var tabsHtml = '<div class="tabs">'
    + '<div class="tab' + (currentTab === 'headers' ? ' active' : '') + '" data-tab="headers">Headers</div>'
    + '<div class="tab' + (currentTab === 'request' ? ' active' : '') + '" data-tab="request">Request Body' + (entry.requestBodySize ? '<span class="count-badge">' + formatSize(entry.requestBodySize) + '</span>' : '') + '</div>'
    + '<div class="tab' + (currentTab === 'response' ? ' active' : '') + '" data-tab="response">Response Body' + (entry.responseBodySize ? '<span class="count-badge">' + formatSize(entry.responseBodySize) + '</span>' : '') + '</div>'
    + '</div>';

  var headersContent = '<div class="tab-content' + (currentTab !== 'headers' ? ' hidden' : '') + '" id="tab-headers">' + renderHeaders(entry) + '</div>';
  var requestContent = '<div class="tab-content' + (currentTab !== 'request' ? ' hidden' : '') + '" id="tab-request">' + formatBody(reqBody, entry.requestHeaders) + '</div>';
  var responseContent = '<div class="tab-content' + (currentTab !== 'response' ? ' hidden' : '') + '" id="tab-response">' + formatBody(resBody, entry.responseHeaders) + '</div>';

  detail.innerHTML = tabsHtml + headersContent + requestContent + responseContent;
}

function showTab(tabName) {
  currentTab = tabName;
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tabName);
  }
  var contents = document.querySelectorAll('.tab-content');
  for (var j = 0; j < contents.length; j++) {
    contents[j].classList.toggle('hidden', contents[j].id !== 'tab-' + tabName);
  }
}

// Event delegation for traffic items
document.getElementById('entries-list').addEventListener('click', function(e) {
  var item = e.target.closest('.traffic-item');
  if (item) {
    selectEntry(parseInt(item.getAttribute('data-index'), 10));
  }
});

// Event delegation for tabs
document.getElementById('detail').addEventListener('click', function(e) {
  var tab = e.target.closest('.tab');
  if (tab && tab.getAttribute('data-tab')) {
    showTab(tab.getAttribute('data-tab'));
  }
});

// Search filtering
document.getElementById('search').addEventListener('input', function() {
  renderList(this.value);
});

// Initial render
renderList('');
</script>
</body>
</html>`;
}

export default router;
