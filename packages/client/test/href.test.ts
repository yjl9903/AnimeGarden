import { describe, expect, it } from 'vitest';

import { transformFansubHref, transformPublisherHref, transformResourceHref } from '../src';

describe('href', () => {
  it('should transform mikan resource href', () => {
    expect(transformResourceHref('mikan', '22ab4969f1aa0c058bfbd014be802b6cc1956eb2')).toBe(
      'https://mikanani.me/Home/Episode/22ab4969f1aa0c058bfbd014be802b6cc1956eb2'
    );
  });

  it('should transform mikan publisher and fansub href', () => {
    expect(transformPublisherHref('mikan', '12')).toBe('https://mikanani.me/Home/PublishGroup/12');
    expect(transformFansubHref('mikan', '12')).toBe('https://mikanani.me/Home/PublishGroup/12');
  });
});
