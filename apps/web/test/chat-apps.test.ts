import { describe, expect, it } from 'vitest';

import { getChatAppLinks } from '../src/components/Skills/chat-apps';
import { examples, skillPrompt, skillURL } from '../src/pages/skills/content';

describe('chat app prompt links', () => {
  it.each([
    skillPrompt,
    ...examples.map((example) =>
      example.prompt.replace('AnimeGarden', `[AnimeGarden](${skillURL})`)
    )
  ])('uses the GitHub Skill only for DeepSeek and Qingyan: %s', (prompt) => {
    const githubURL =
      'https://github.com/yjl9903/AnimeGarden/blob/main/skills/animegarden/SKILL.md';
    const rawURL =
      'https://raw.githubusercontent.com/yjl9903/AnimeGarden/main/skills/animegarden/SKILL.md';
    for (const app of getChatAppLinks(prompt)) {
      if (['DeepSeek', '智谱清言'].includes(app.name)) {
        expect(app.prompt).toBe(
          prompt.replace(skillURL, app.name === '智谱清言' ? rawURL : githubURL)
        );
        expect(new URL(app.href).search).toBe('');
      } else {
        expect(app.prompt).toBe(prompt);
      }
    }
  });

  it('applies overrides before URL encoding and preserves unrelated links and text', () => {
    const alternateURL = 'https://example.com/SKILL.md?source=chat&value=$&';
    const prompt = `${skillPrompt}\n原地址 ${skillURL}\n[其他链接](${skillURL})\nA&B + #1 / 100%`;
    const apps = getChatAppLinks(prompt, { claude: alternateURL, deepseek: alternateURL });
    const expectedPrompt = prompt.replace(
      `[AnimeGarden](${skillURL})`,
      () => `[AnimeGarden](${alternateURL})`
    );
    const claude = apps.find((app) => app.name === 'Claude')!;
    const deepseek = apps.find((app) => app.name === 'DeepSeek')!;
    expect(new URL(claude.href).searchParams.get('q')).toBe(expectedPrompt);
    expect(claude.prompt).toBe(expectedPrompt);
    expect(deepseek.prompt).toBe(expectedPrompt);
    expect(new URL(deepseek.href).search).toBe('');
    expect(apps.find((app) => app.name === 'ChatGPT')!.prompt).toBe(prompt);
  });

  it('leaves prompts without a generated Skill mention unchanged', () => {
    const prompt = '查找上伊那牡丹第一话资源';
    expect(getChatAppLinks(prompt).every((app) => app.prompt === prompt)).toBe(true);
  });

  it('preserves Markdown links, Chinese and reserved characters in each app parameter', () => {
    const prompt = `${skillPrompt}\n请保留 A&B + #1 / 100%`;
    const links = getChatAppLinks(prompt).filter((app) => app.mode === 'prefill');
    expect(links.map((app) => app.name)).toEqual(['ChatGPT', 'Codex', 'Claude', 'Cursor']);
    const expected = [
      ['https:', 'chatgpt.com', '/', 'prompt'],
      ['codex:', 'new', '', 'prompt'],
      ['https:', 'claude.ai', '/new', 'q'],
      ['https:', 'cursor.com', '/link/prompt', 'text']
    ];
    links.forEach((app, index) => {
      const url = new URL(app.href);
      const [protocol, hostname, pathname, parameter] = expected[index];
      expect(url.protocol).toBe(protocol);
      expect(url.hostname).toBe(hostname);
      expect(url.pathname).toBe(pathname);
      expect(url.searchParams.get(parameter)).toBe(prompt);
      expect(url.hash).toBe('');
    });
    expect(new URL(links[0].href).searchParams.get('surface')).toBe('work');
    expect(new URL(links[0].href).searchParams.has('hints')).toBe(false);
  });
});
