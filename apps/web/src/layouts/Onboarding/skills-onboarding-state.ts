const countKey = 'animegarden:skills-onboarding:views';
const sessionKey = 'animegarden:skills-onboarding:shown';
const maxViews = 2;

/** Minimal storage contract so visit limits can be tested without browser globals. */
type OnboardingStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Claims one impression per tab session, capped at two across visits. */
export function claimSkillsOnboarding(local: OnboardingStorage, session: OnboardingStorage) {
  try {
    if (session.getItem(sessionKey)) return false;
    const saved = Number(local.getItem(countKey) ?? 0);
    const count = Number.isSafeInteger(saved) && saved >= 0 ? saved : 0;
    if (count >= maxViews) return false;

    // Persist before showing so reloads and route remounts cannot repeat the prompt.
    local.setItem(countKey, String(count + 1));
    session.setItem(sessionKey, '1');
    return true;
  } catch {
    // Without storage, suppress the prompt instead of showing it on every visit.
    return false;
  }
}

/** Following the introduction completes onboarding and suppresses future prompts. */
export function completeSkillsOnboarding(local: OnboardingStorage) {
  try {
    local.setItem(countKey, String(maxViews));
  } catch {
    // The link still works if browser storage is unavailable.
  }
}
