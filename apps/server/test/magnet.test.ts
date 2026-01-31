import { describe, it, expect } from 'vitest';

import { normalizeBtihToBase32, normalizeBtihToHex } from '../src/utils';

describe('magnet', () => {
  it('should convert base32 to hex', () => {
    expect(
      normalizeBtihToHex('magnet:?xt=urn:btih:GNHNWZQ5KPEVEMNRHBPO3CJHZHDWNOJK')
    ).toMatchInlineSnapshot(`"magnet:?xt=urn:btih:334edb661d53c95231b1385eed8927c9c766b92a"`);

    expect(
      normalizeBtihToHex('magnet:?xt=urn:btih:334edb661d53c95231b1385eed8927c9c766b92a')
    ).toMatchInlineSnapshot(`"magnet:?xt=urn:btih:334edb661d53c95231b1385eed8927c9c766b92a"`);
  });

  it('should convert hex to base32', () => {
    expect(
      normalizeBtihToBase32('magnet:?xt=urn:btih:334edb661d53c95231b1385eed8927c9c766b92a')
    ).toMatchInlineSnapshot(`"magnet:?xt=urn:btih:GNHNWZQ5KPEVEMNRHBPO3CJHZHDWNOJK"`);
    expect(
      normalizeBtihToBase32('magnet:?xt=urn:btih:GNHNWZQ5KPEVEMNRHBPO3CJHZHDWNOJK')
    ).toMatchInlineSnapshot(`"magnet:?xt=urn:btih:GNHNWZQ5KPEVEMNRHBPO3CJHZHDWNOJK"`);
  });
});
