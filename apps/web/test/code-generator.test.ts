import { describe, it, expect } from 'vitest';

import {
  generateCurlCode,
  generateJavaScriptCode,
  generatePythonCode
} from '../app/utils/code-generator';

describe('Code Generator', () => {
  const mockFilter = {
    types: ['动画'],
    fansubs: ['桜都字幕组'],
    search: ['葬送的芙莉莲']
  };

  const mockSubject = {
    id: 12345,
    bangumi: {
      name_cn: '葬送的芙莉莲'
    }
  } as any;

  it('should generate curl code', () => {
    const result = generateCurlCode({ filter: mockFilter });
    expect(result).toMatchInlineSnapshot(
      `"curl "https://api.animes.garden/resources?fansub=%E6%A1%9C%E9%83%BD%E5%AD%97%E5%B9%95%E7%BB%84&search=%E8%91%AC%E9%80%81%E7%9A%84%E8%8A%99%E8%8E%89%E8%8E%B2&type=%E5%8A%A8%E7%94%BB""`
    );
  });

  it('should generate JavaScript code', () => {
    const result = generateJavaScriptCode({ filter: mockFilter });
    expect(result).toMatchInlineSnapshot(`
      "import { fetchResources } from '@animegarden/client';

      const resources = await fetchResources({
        types: ["动画"],
        fansubs: ["桜都字幕组"],
        search: ["葬送的芙莉莲"]
      });"
    `);
  });

  it('should generate Python code', () => {
    const result = generatePythonCode({ filter: mockFilter });
    expect(result).toMatchInlineSnapshot(`
      "import requests

      url = "https://api.animes.garden/resources"
      params = {
        'type': ["动画"],
        'fansub': ["桜都字幕组"],
        'search': ["葬送的芙莉莲"]
      }

      response = requests.get(url, params=params)
      resources = response.json()"
    `);
  });

  it('should handle subject correctly', () => {
    const result = generateJavaScriptCode({ filter: mockFilter, subject: mockSubject });
    expect(result).toMatchInlineSnapshot(`
      "import { fetchResources } from '@animegarden/client';

      const resources = await fetchResources({
        types: ["动画"],
        subjects: [12345],
        fansubs: ["桜都字幕组"],
        search: ["葬送的芙莉莲"]
      });"
    `);
  });

  it('should throw error when no filter provided', () => {
    expect(() => generateCurlCode({})).toThrow('没有筛选条件');
    expect(() => generateJavaScriptCode({})).toThrow('没有筛选条件');
    expect(() => generatePythonCode({})).toThrow('没有筛选条件');
  });
});
