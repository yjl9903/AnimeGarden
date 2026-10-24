// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SkillsPage from '../src/pages/skills/route';

vi.mock('~/layouts/Layout', () => ({
  default: ({ children }: { children: ReactNode }) => children
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>
}));

vi.mock('~/components/Skills/OpenInChat', () => ({ OpenInChat: () => null }));

describe('Skills copy buttons', () => {
  let root: Root;
  let container: HTMLDivElement;
  const track = vi.fn();
  const writeText = vi.fn();

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('umami', { track });
    Object.assign(window, { umami: { track } });
    writeText.mockResolvedValue(undefined);
    container = document.createElement('div');
    root = createRoot(container);
    await act(async () => root.render(<SkillsPage />));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    Reflect.deleteProperty(window, 'umami');
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it.each([
    { selector: '.skills-chat-user-message', kind: 'prompt', source: 'hero' },
    { selector: '#use-skill', kind: 'prompt', source: 'online' },
    { selector: '#install-skill', kind: 'command', source: 'local' },
    { selector: '#install-mcp', kind: 'command', source: 'mcp.codex' },
    { selector: '#install-mcp', kind: 'command', source: 'mcp.claude', tab: 'Claude Code' },
    { selector: '#install', kind: 'command', source: 'plugin.codex' },
    { selector: '#install', kind: 'command', source: 'plugin.claude', tab: 'Claude Code' },
    {
      selector: '.skills-example',
      kind: 'example',
      source: 'example',
      example: '找一部动画'
    }
  ])('tracks a successful copy from $source', async ({ selector, kind, source, tab, example }) => {
    const section = container.querySelector(selector)!;
    if (tab) {
      const button = [...section.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
        (button) => button.textContent === tab
      )!;
      await act(async () => button.click());
    }

    await act(async () => section.querySelector<HTMLButtonElement>('.skills-copy')!.click());

    expect(writeText).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledExactlyOnceWith('skills.copy', {
      kind,
      source,
      ...(example ? { example } : {})
    });
    expect(section.querySelector('.skills-copy')?.getAttribute('aria-label')).toBe('已复制');
  });

  it('waits for clipboard success before tracking', async () => {
    let finishCopy!: () => void;
    writeText.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishCopy = resolve;
      })
    );
    const button = container.querySelector<HTMLButtonElement>('.skills-copy')!;

    await act(async () => button.click());
    expect(writeText).toHaveBeenCalledOnce();
    expect(track).not.toHaveBeenCalled();

    await act(async () => finishCopy());
    expect(track).toHaveBeenCalledExactlyOnceWith('skills.copy', {
      kind: 'prompt',
      source: 'hero'
    });
  });

  it('shows clipboard failure without tracking', async () => {
    writeText.mockRejectedValueOnce(new Error('Clipboard access denied'));
    const button = container.querySelector<HTMLButtonElement>('.skills-copy')!;

    await act(async () => button.click());

    expect(track).not.toHaveBeenCalled();
    expect(button.getAttribute('aria-label')).toBe('请手动选择复制');
  });
});
