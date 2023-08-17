import { describe, it, expect } from 'vitest';

import { hash } from 'ohash';

describe('ohash', () => {
  it('should hash', () => {
    expect(hash({ pageSize: 80, page: 1, fansubId: [520], type: '其他' })).toMatchInlineSnapshot('"6RrIhUOCmW"');
  });
});
