import { btihBase32ToHex, btihHexToBase32, extractBtihFromMagnet } from '@animegarden/shared';

export function getInfoHash(magnet: string) {
  const r = extractBtihFromMagnet(magnet);
  if (r) {
    const hex = r.format === 'hex' ? r.value : btihBase32ToHex(r.value);
    return hex;
  }
  return magnet;
}

export function isSameMagnet(magnet: string, infoHash: string) {
  const r = extractBtihFromMagnet(magnet);
  if (r) {
    const hex = r.format === 'hex' ? r.value : btihBase32ToHex(r.value);
    const base32 = r.format === 'base32' ? r.value : btihHexToBase32(r.value);
    return hex === infoHash || hex === base32;
  }
  return false;
}
