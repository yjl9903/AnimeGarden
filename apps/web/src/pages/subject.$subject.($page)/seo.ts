import type { ResolvedFilterOptions } from '@animegarden/client';
import { truncate } from '@animegarden/shared';

import { generateResourcesPageHeading } from '~/pages/resources.($page)/seo';
import { getCanonicalURL } from '~/utils/canonical';
import {
  buildOpenGraphMeta,
  buildPageTitle,
  buildSubjectSchema,
  buildTwitterCardMeta,
  normalizeSeoText,
  toJsonLdMeta,
  type PageSeoData
} from '~/utils/seo';
import { getSubjectDisplayName, type WebBgmSubject } from '~/utils/subject';

/** Returns Subject SEO data shared by HTML and Markdown responses. */
export function buildSubjectPageSeo(
  subject: WebBgmSubject | undefined,
  filter?: ResolvedFilterOptions
): PageSeoData & { subjectName: string } {
  const subjectName = getSubjectDisplayName(subject);
  const heading = subjectName
    ? `${subjectName} 最新动画资源`
    : generateResourcesPageHeading(filter ?? {}, subject ? { [subject.id]: subject } : {});
  const summary = normalizeSeoText(subject?.summary);
  const description = summary ? truncate(summary, 120) : undefined;

  return {
    subjectName,
    title: buildPageTitle(heading),
    description,
    image: subject?.poster,
    imageAlt: subject?.poster && subjectName ? `${subjectName} 海报` : undefined
  };
}

/** Builds the complete HTML head configuration for a Subject page. */
export function buildSubjectPageHead(
  subject: WebBgmSubject | undefined,
  filter: ResolvedFilterOptions | undefined,
  subjectParam: string
) {
  const canonical = getCanonicalURL(`/subject/${subjectParam}`);
  const seo = buildSubjectPageSeo(subject, filter);
  const social = { ...seo, url: canonical };
  const structuredData =
    subject && seo.subjectName
      ? [
          toJsonLdMeta(
            buildSubjectSchema({
              canonical,
              subjectId: subject.id,
              name: seo.subjectName,
              description: seo.description,
              entityType: subject.platform === 'TV' ? 'TVSeries' : 'CreativeWork',
              image: seo.image
            })
          )
        ]
      : [];

  return {
    meta: [
      { title: seo.title },
      ...(seo.description ? [{ name: 'description', content: seo.description }] : []),
      ...structuredData,
      ...buildOpenGraphMeta(social),
      ...buildTwitterCardMeta(social)
    ],
    links: [{ rel: 'canonical', href: canonical }]
  };
}
