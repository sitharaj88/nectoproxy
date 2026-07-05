// Session token handling for the control-plane API / Socket.IO.
//
// The server injects `window.__NECTO_TOKEN__` into the served index.html. As a
// fallback (e.g. the very first page load opened via a `?token=` URL before the
// injected global is guaranteed available), we also read the token from the URL
// query, persist it to sessionStorage, and strip it from the visible URL.

declare global {
  interface Window {
    __NECTO_TOKEN__?: string;
  }
}

const STORAGE_KEY = 'necto_session_token';

/**
 * Read a `?token=` from the current URL (if present), persist it, and remove it
 * from the address bar. Call once at app startup, before any API/socket usage.
 */
export function initToken(): void {
  try {
    const url = new URL(window.location.href);
    const urlToken = url.searchParams.get('token');
    if (urlToken) {
      window.__NECTO_TOKEN__ = urlToken;
      try {
        sessionStorage.setItem(STORAGE_KEY, urlToken);
      } catch {
        // sessionStorage may be unavailable; ignore.
      }
      url.searchParams.delete('token');
      const cleaned = url.pathname + (url.search ? url.search : '') + url.hash;
      window.history.replaceState({}, document.title, cleaned || '/');
    }
  } catch {
    // Ignore malformed URLs.
  }
}

/**
 * Resolve the session token from (in order): the server-injected global, the
 * URL query, then sessionStorage. Returns an empty string if none is found.
 */
export function getToken(): string {
  if (window.__NECTO_TOKEN__) return window.__NECTO_TOKEN__;
  try {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      window.__NECTO_TOKEN__ = urlToken;
      return urlToken;
    }
  } catch {
    // ignore
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      window.__NECTO_TOKEN__ = stored;
      return stored;
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Append the session token to a same-origin URL as a `?token=` query param.
 * Used for direct navigations/downloads (links, `window.location`) that cannot
 * carry an Authorization header.
 */
export function withToken(url: string): string {
  const token = getToken();
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}
