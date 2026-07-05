/**
 * Copy text to clipboard with fallback for non-secure contexts.
 *
 * navigator.clipboard.writeText() requires a secure context (HTTPS or localhost).
 * When the Web UI is accessed via a LAN IP (e.g. http://192.168.x.x:8889),
 * the clipboard API is unavailable. This utility falls back to the legacy
 * execCommand('copy') approach using a temporary textarea.
 *
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy path
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(textarea);
  }
  return ok;
}
