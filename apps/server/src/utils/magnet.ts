// btih(v1) Base32 <-> Hex conversion (RFC 4648 alphabet, magnet style no padding)

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' as const;

const B32_LOOKUP: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  for (let i = 0; i < B32_ALPHABET.length; i++) map.set(B32_ALPHABET[i], i);
  return map;
})();

export function base32ToBytes(b32: string): Uint8Array {
  const s = b32.trim().toUpperCase().replace(/=+$/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];

  for (const ch of s) {
    const v = B32_LOOKUP.get(ch);
    if (v == null) throw new Error(`Invalid base32 char: ${ch}`);
    value = (value << 5) | v;
    bits += 5;

    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Uint8Array.from(out);
}

export function bytesToBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';

  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;

    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    out += B32_ALPHABET[(value << (5 - bits)) & 31];
  }

  // Magnet 通常不带 '=' padding
  return out;
}

export function hexToBytes(hex: string): Uint8Array {
  const h = hex.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(h) || h.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

// ---- btih(v1) helpers (must be 20 bytes) ----

export function btihBase32ToHex(btihB32: string): string {
  const bytes = base32ToBytes(btihB32);
  if (bytes.length !== 20) {
    throw new Error(`btih(v1) must be 20 bytes, got ${bytes.length}`);
  }
  return bytesToHex(bytes);
}

export function btihHexToBase32(btihHex: string): string {
  const bytes = hexToBytes(btihHex);
  if (bytes.length !== 20) {
    throw new Error(`btih(v1) must be 20 bytes, got ${bytes.length}`);
  }
  return bytesToBase32(bytes);
}

// ---- optional: parse magnet and extract btih ----
// Supports multiple xt=...; returns the first btih found.
function extractBtihFromMagnet(
  magnetUrl: string
): { format: 'hex' | 'base32'; value: string } | null {
  const url = magnetUrl.trim();
  if (!url.toLowerCase().startsWith('magnet:?')) return null;

  const query = url.slice('magnet:?'.length);
  const params = new URLSearchParams(query);

  // There may be multiple xt params
  const xts = params.getAll('xt');
  for (const xt of xts) {
    const m = /^urn:btih:([a-zA-Z0-9]+)$/.exec(xt);
    if (!m) continue;

    const v = m[1];
    if (/^[0-9a-fA-F]{40}$/.test(v)) return { format: 'hex', value: v.toLowerCase() };
    if (/^[A-Z2-7]{32}$/i.test(v)) return { format: 'base32', value: v.toUpperCase() };

    // Some tools may use non-standard lengths; return as-is (unknown)
    return null;
  }

  return null;
}

// ---- optional: normalize magnet to hex/base32 btih ----
export function normalizeBtihToHex(magnetUrl: string): string {
  const r = extractBtihFromMagnet(magnetUrl);
  if (!r) return magnetUrl;
  return r.format === 'hex' ? magnetUrl : 'magnet:?xt=urn:btih:' + btihBase32ToHex(r.value);
}

export function normalizeBtihToBase32(magnetUrl: string): string {
  const r = extractBtihFromMagnet(magnetUrl);
  if (!r) return magnetUrl;
  return r.format === 'base32' ? magnetUrl : 'magnet:?xt=urn:btih:' + btihHexToBase32(r.value);
}
