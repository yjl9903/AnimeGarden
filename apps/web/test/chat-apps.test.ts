import { describe, expect, it } from 'vitest';

import { getChatAppLinks } from '../src/components/Skills/chat-apps';
import { skillPrompt } from '../src/pages/skills/content';

describe('chat app prompt links', () => {
  it('preserves Markdown links, Chinese and reserved characters in each app parameter', () => {
    const prompt = `${skillPrompt}\n请保留 A&B + #1 / 100%`;
    const links = getChatAppLinks(prompt);
    expect(links.map((app) => app.name)).toEqual(['ChatGPT', 'Claude', 'Cursor']);
    const expected = [
      ['https://chatgpt.com', '/', 'prompt'],
      ['https://claude.ai', '/new', 'q'],
      ['https://cursor.com', '/link/prompt', 'text']
    ];
    links.forEach((app, index) => {
      const url = new URL(app.href);
      const [origin, pathname, parameter] = expected[index];
      expect(url.origin).toBe(origin);
      expect(url.pathname).toBe(pathname);
      expect(url.searchParams.get(parameter)).toBe(prompt);
      expect(url.hash).toBe('');
    });
    expect(new URL(links[0].href).searchParams.get('hints')).toBe('search');
  });
});
