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
    expect(result).toContain('curl "');
    expect(result).toContain('api.animes.garden/resources');
    expect(result).toContain('type=%E5%8A%A8%E7%94%BB');
    expect(result).toContain('fansub=%E6%A1%9C%E9%83%BD%E5%AD%97%E5%B9%95%E7%BB%84');
  });

  it('should generate JavaScript code', () => {
    const result = generateJavaScriptCode({ filter: mockFilter });
    expect(result).toContain("import { fetchResources } from '@animegarden/client'");
    expect(result).toContain('types: ["动画"]');
    expect(result).toContain('fansubs: ["桜都字幕组"]');
    expect(result).toContain('search: ["葬送的芙莉莲"]');
  });

  it('should generate Python code', () => {
    const result = generatePythonCode({ filter: mockFilter });
    expect(result).toContain('import requests');
    expect(result).toContain('api.animes.garden/resources');
    expect(result).toContain("'type': ['动画']");
    expect(result).toContain("'fansub': ['桜都字幕组']");
    expect(result).toContain("'search': ['葬送的芙莉莲']");
  });

  it('should handle subject correctly', () => {
    const result = generateJavaScriptCode({ filter: mockFilter, subject: mockSubject });
    expect(result).toContain('subjects: [12345]');
  });

  it('should throw error when no filter provided', () => {
    expect(() => generateCurlCode({})).toThrow('没有筛选条件');
    expect(() => generateJavaScriptCode({})).toThrow('没有筛选条件');
    expect(() => generatePythonCode({})).toThrow('没有筛选条件');
  });
});
