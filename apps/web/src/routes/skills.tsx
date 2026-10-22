import { createFileRoute } from '@tanstack/react-router';

import SkillsPage from '~/pages/skills/route';
import { skillsPageMetadata } from '~/pages/skills/content';
import { getCanonicalURL } from '~/utils/canonical';
import { buildPageTitle } from '~/utils/seo';

export const Route = createFileRoute('/skills')({
  head: () => ({
    meta: [
      { title: buildPageTitle(skillsPageMetadata.title) },
      {
        name: 'description',
        content: skillsPageMetadata.description
      }
    ],
    links: [{ rel: 'canonical', href: getCanonicalURL('/skills') }]
  }),
  component: SkillsPage
});
