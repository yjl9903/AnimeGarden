import { describe, expect, it } from 'vitest';

import { hashCollection } from '../src';

describe('collection', () => {
  it('should hash collection', async () => {
    expect(
      await hashCollection({
        name: '收藏夹',
        authorization: 'b7f69b00-57c2-408b-a623-ee2c46d24db2',
        filters: [
          {
            subjects: [513018],
            fansubs: ['ANi'],
            after: new Date('2025-03-24T16:00:00.000Z'),
            name: '',
            searchParams: '?after=1742832000000&fansub=ANi&subject=513018'
          }
        ]
      })
    ).toMatchInlineSnapshot(`"659751637474909a53073b44cd7a70fd189b0866"`);
  });
});
