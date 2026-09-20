import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { describe, expect, it } from 'vitest';

import { getRssString } from '../src/server/rss/index';

describe('RSS structured extensions', () => {
  it('escapes text, preserves falsy scalars and omits nullish values', async () => {
    const text = '<tag>& "quoted" &amp;';
    const xml = await getRssString({
      title: 'Test feed',
      description: 'Test extensions',
      site: 'https://animes.garden',
      xmlns: { animegarden: 'https://animes.garden/ns/rss/1.0' },
      items: [
        {
          title: 'Test item',
          pubDate: new Date('2026-09-20T00:00:00Z'),
          customData: '<animegarden:legacy>kept</animegarden:legacy>',
          extensions: {
            'animegarden:text': text,
            'animegarden:zero': 0,
            'animegarden:enabled': false,
            'animegarden:empty': '',
            'animegarden:null': null,
            'animegarden:undefined': undefined
          }
        }
      ]
    });

    expect(XMLValidator.validate(xml)).toBe(true);
    const { item } = new XMLParser({ parseTagValue: false }).parse(xml).rss.channel;
    expect(item).toMatchObject({
      'animegarden:legacy': 'kept',
      'animegarden:text': text,
      'animegarden:zero': '0',
      'animegarden:enabled': 'false',
      'animegarden:empty': ''
    });
    expect(item).not.toHaveProperty('animegarden:null');
    expect(item).not.toHaveProperty('animegarden:undefined');
  });

  it.each(['title', 'bad name:value', 'prefix:bad<name'])(
    'rejects invalid extension name %s',
    async (name) => {
      await expect(
        getRssString({
          title: 'Test feed',
          description: 'Test extensions',
          site: 'https://animes.garden',
          items: [{ title: 'Test item', pubDate: new Date(), extensions: { [name]: 'value' } }]
        })
      ).rejects.toThrow('[RSS] Invalid or missing options');
    }
  );
});
