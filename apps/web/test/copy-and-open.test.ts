import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyPromptAndOpen } from '../src/components/Skills/copy-and-open';
import { getChatAppLinks } from '../src/components/Skills/chat-apps';

afterEach(() => vi.unstubAllGlobals());

describe('clipboard app handoff', () => {
  it('copies the complete prompt before navigating and removes the opener', async () => {
    let finishCopy!: () => void;
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCopy = resolve;
        })
    );
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('window', { open: vi.fn(() => tab) });
    const prompt = '使用 [AnimeGarden](https://example.com/SKILL.md)\n查找 A&B';
    const pending = copyPromptAndOpen(prompt, 'https://www.kimi.com/');
    expect(writeText).toHaveBeenCalledWith(prompt);
    expect(tab.location.replace).not.toHaveBeenCalled();
    expect(tab.opener).toBeNull();
    finishCopy();
    await pending;
    expect(tab.location.replace).toHaveBeenCalledWith('https://www.kimi.com/');
  });

  it('closes the reserved tab without navigating when clipboard access is denied', async () => {
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }
    });
    vi.stubGlobal('window', { open: vi.fn(() => tab) });
    await expect(copyPromptAndOpen('prompt', 'https://www.kimi.com/')).rejects.toThrow('denied');
    expect(tab.close).toHaveBeenCalledOnce();
    expect(tab.location.replace).not.toHaveBeenCalled();
  });

  it('uses the current tab after copying when popups are blocked', async () => {
    const assign = vi.fn();
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    vi.stubGlobal('window', { open: vi.fn(() => null), location: { assign } });
    await copyPromptAndOpen('prompt', 'https://www.kimi.com/');
    expect(assign).toHaveBeenCalledWith('https://www.kimi.com/');
  });

  it('keeps clipboard prompts out of domestic app URLs', () => {
    const apps = getChatAppLinks('private prompt').filter((app) => app.mode === 'copy');
    expect(apps.map((app) => app.name)).toEqual([
      'DeepSeek',
      '豆包',
      '千问',
      'Kimi',
      '智谱清言',
      'MiniMax'
    ]);
    for (const app of apps) {
      expect(new URL(app.href).protocol).toBe('https:');
      expect(new URL(app.href).search).toBe('');
    }
  });
});
