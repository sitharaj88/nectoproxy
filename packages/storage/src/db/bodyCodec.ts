import { gzipSync, gunzipSync } from 'node:zlib';

/**
 * Transparent body compression codec for SQLite blob columns.
 *
 * On-disk blob format (marker-byte scheme):
 *   [ 0x00, ...raw bytes  ]  -> stored uncompressed (small body / marker RAW)
 *   [ 0x01, ...gzip bytes ]  -> stored gzip-compressed (marker GZIP)
 *
 * The leading marker byte is unambiguous, so a body whose own first bytes
 * happen to be the gzip magic (0x1f 0x8b) can never be misread.
 *
 * Backward compatibility: rows written before this feature existed have NO
 * marker byte (they are legacy raw blobs). `decodeBody` falls back to treating
 * any blob that is not a well-formed marked blob as legacy raw bytes, so old
 * rows keep reading correctly without a schema migration.
 */

const MARKER_RAW = 0x00;
const MARKER_GZIP = 0x01;

// Bodies below this size are stored raw; gzip overhead is not worth it.
const COMPRESS_THRESHOLD = 256;

// gzip magic bytes
const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

function toBuffer(body: Buffer | Uint8Array): Buffer {
  return Buffer.isBuffer(body) ? body : Buffer.from(body);
}

/**
 * Encode a body for storage. Returns `null`/`undefined` unchanged so NULL
 * columns stay NULL. Non-empty and empty buffers both round-trip.
 */
export function encodeBody(body: Buffer | null | undefined): Buffer | null | undefined {
  if (body === null || body === undefined) {
    return body;
  }

  const buf = toBuffer(body);

  if (buf.length >= COMPRESS_THRESHOLD) {
    const gz = gzipSync(buf);
    // Only keep the compressed form if it is actually smaller.
    if (gz.length + 1 < buf.length + 1) {
      return Buffer.concat([Buffer.from([MARKER_GZIP]), gz]);
    }
  }

  return Buffer.concat([Buffer.from([MARKER_RAW]), buf]);
}

/**
 * Decode a stored blob back to the original body. Reverses `encodeBody` and
 * transparently handles legacy (unmarked) rows.
 */
export function decodeBody(stored: Buffer | null | undefined): Buffer | null {
  if (stored === null || stored === undefined) {
    return null;
  }

  const buf = toBuffer(stored);

  if (buf.length === 0) {
    return buf;
  }

  const marker = buf[0];

  if (
    marker === MARKER_GZIP &&
    buf.length >= 3 &&
    buf[1] === GZIP_MAGIC_0 &&
    buf[2] === GZIP_MAGIC_1
  ) {
    return gunzipSync(buf.subarray(1));
  }

  if (marker === MARKER_RAW) {
    return Buffer.from(buf.subarray(1));
  }

  // Legacy row without a marker byte (written before compression existed),
  // or a 0x01-prefixed blob that is not valid gzip: read as raw bytes.
  return Buffer.from(buf);
}
