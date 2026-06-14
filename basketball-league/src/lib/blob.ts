// Normalize a DB blob to a Uint8Array suitable for a Response body. libsql
// returns blobs as a Node Buffer in some runtimes (local dev) and a plain
// ArrayBuffer in others (Vercel). Using `.length` on an ArrayBuffer yields
// undefined, which makes an invalid Content-Length header and a 500. Always
// return a fresh ArrayBuffer-backed copy and use byteLength.
export function toBytes(value: unknown): Uint8Array<ArrayBuffer> {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value.slice(0));
  }
  if (ArrayBuffer.isView(value)) {
    const v = value as ArrayBufferView;
    const out = new Uint8Array(v.byteLength);
    out.set(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
    return out;
  }
  // Fallback for array-like / iterable values.
  return Uint8Array.from(value as Iterable<number>);
}
