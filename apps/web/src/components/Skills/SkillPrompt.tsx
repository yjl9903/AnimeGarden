import { skillURL } from '~/pages/skills/content';

import './skill-prompt.css';

/** Shared rendered prompt for the Skills conversation and onboarding composer. */
export function SkillPrompt() {
  return (
    <span className="skill-prompt">
      使用{' '}
      <a className="skill-prompt-mention" href={skillURL} target="_blank" rel="noreferrer">
        <img src="/favicon.svg" width={16} height={16} alt="" />
        AnimeGarden
      </a>{' '}
      查找上伊那牡丹第一话资源
    </span>
  );
}
