import { describe, expect, it } from 'vitest';

import {
  claimSkillsOnboarding,
  completeSkillsOnboarding
} from '../src/layouts/Onboarding/skills-onboarding-state';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    }
  };
}

describe('Skills onboarding visit limit', () => {
  it('shows once in each of the first two sessions, never on reload or later visits', () => {
    const local = storage();
    const firstSession = storage();
    expect(claimSkillsOnboarding(local, firstSession)).toBe(true);
    expect(claimSkillsOnboarding(local, firstSession)).toBe(false);
    const secondSession = storage();
    expect(claimSkillsOnboarding(local, secondSession)).toBe(true);
    expect(claimSkillsOnboarding(local, secondSession)).toBe(false);
    expect(claimSkillsOnboarding(local, storage())).toBe(false);
  });

  it('stops future prompts after following the Skills link', () => {
    const local = storage();
    expect(claimSkillsOnboarding(local, storage())).toBe(true);
    completeSkillsOnboarding(local);
    expect(claimSkillsOnboarding(local, storage())).toBe(false);
  });

  it('recovers from malformed counts without allowing unlimited impressions', () => {
    const local = storage();
    local.setItem('animegarden:skills-onboarding:views', 'invalid');
    expect(claimSkillsOnboarding(local, storage())).toBe(true);
    expect(claimSkillsOnboarding(local, storage())).toBe(true);
    expect(claimSkillsOnboarding(local, storage())).toBe(false);
  });

  it('suppresses prompts when storage is unavailable', () => {
    const unavailable = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      }
    };
    expect(claimSkillsOnboarding(unavailable, storage())).toBe(false);
    expect(claimSkillsOnboarding(storage(), unavailable)).toBe(false);
    expect(() => completeSkillsOnboarding(unavailable)).not.toThrow();
  });
});
