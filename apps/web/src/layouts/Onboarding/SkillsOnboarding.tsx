import { useEffect, useRef, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ArrowUp, X } from 'lucide-react';

import { SkillPrompt } from '~/components/Skills/SkillPrompt';

import { claimSkillsOnboarding, completeSkillsOnboarding } from './skills-onboarding-state';

/** A non-modal introduction shown on the first page of the first two tab sessions. */
export function SkillsOnboarding() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const checked = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const firstPage = !checked.current;
    checked.current = true;
    if (pathname.replace(/\/+$/, '') === '/skills') {
      setVisible(false);
      return;
    }
    if (!firstPage) return;

    // Storage access stays after hydration and may itself throw in private contexts.
    try {
      setVisible(claimSkillsOnboarding(window.localStorage, window.sessionStorage));
    } catch {
      setVisible(false);
    }
  }, [pathname]);

  if (!visible) return null;

  function openSkills() {
    setVisible(false);
    try {
      completeSkillsOnboarding(window.localStorage);
    } catch {
      // Navigation must remain available when accessing storage throws.
    }
  }

  return (
    <aside
      className="fixed z-40 right-4 bottom-6 w-[380px] max-w-[calc(100vw-32px)] rounded-xl border border-base bg-white dark:bg-neutral-900 p-4 shadow-xl text-base-900"
      style={{ bottom: 'max(24px, env(safe-area-inset-bottom))' }}
      aria-labelledby="skills-onboarding-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          setVisible(false);
        }
      }}
    >
      <button
        type="button"
        className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded text-base-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-pink-600"
        aria-label="关闭 Skills 引导"
        onClick={() => setVisible(false)}
      >
        <X size={16} aria-hidden="true" />
      </button>
      <h2 id="skills-onboarding-title" className="flex items-center gap-2 pr-6 text-base font-600">
        <span className="rounded bg-pink-50 px-1.5 py-0.5 text-xs font-500 text-pink-600 dark:bg-pink-950 dark:text-pink-400">
          New
        </span>
        把 Anime Garden 带进你的 AI 助手
      </h2>
      <p className="mt-2 text-sm text-base-500">
        <Link to="/skills" className="text-link-active" onClick={openSkills}>
          开始使用 Anime Garden Skills / MCP。
        </Link>
      </p>
      <div className="mt-4 flex flex-col rounded-2xl border border-base bg-transparent p-3 shadow-sm">
        <p className="m-0">
          <SkillPrompt />
        </p>
        <div className="flex justify-end pt-2">
          <Link
            to="/skills"
            aria-label="发送示例，了解 Skills / MCP"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white focus-visible:outline-pink-600 focus-visible:outline-offset-2"
            onClick={openSkills}
          >
            <ArrowUp size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
