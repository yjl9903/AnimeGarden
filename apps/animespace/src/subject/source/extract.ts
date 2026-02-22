import type { System } from '../../system/system.ts';

import type { Subject } from '../subject.ts';

import { isDef } from '../../utils/types.ts';
import { isSameMagnet } from '../../utils/torrent.ts';

import type {
  SubjectResource,
  ParsedSubjectResource,
  ExtractedSubjectResource
} from './resource.ts';
import type { SubjectSource } from './source.ts';

import { SubjectType } from './schema.ts';
import { parseResource } from './parser.ts';
import { renderNamingTemplate, resolveTemplateByType } from './naming.ts';
import { stringifyURLSearch } from '@animegarden/client';

export function getSourceURL(subject: Subject) {
  const { source } = subject;

  if (source.animegarden) {
    return `https://animes.garden/resources?${stringifyURLSearch(source.animegarden.filter).toString()}`;
  }

  return undefined;
}

export async function fetchResources(
  system: System,
  subject: Subject
): Promise<ParsedSubjectResource[]> {
  const resources: SubjectResource[] = [];

  const { source } = subject;

  // 1.1. Fetch from Anime Garden
  if (source.animegarden) {
    const filter = source.animegarden.filter;
    const resp = await system.managers.animegarden.fetchResources(filter);
    resources.push(
      ...resp.resources.map((r) => system.managers.animegarden.transformSubjectResource(r))
    );
  }

  // 1.2. other source provider

  // 2. Parse resource metadata
  const parsed = resources.map((r) => parseResource(subject, r));

  // 3. Apply resource rewrite rules
  const applied = applyResourcesRewriteRules(system, source, parsed);

  // 4. Match with subjectFiles
  const subjectFiles = await subject.getSubjectFiles();
  for (const resource of applied) {
    const related = subjectFiles.filter((subjectFile) => {
      // TODO: should handle resource.pickedFiles
      if (
        resource.animegarden &&
        resource.animegarden.provider === subjectFile.animegardenProvider &&
        resource.animegarden.providerId === subjectFile.animegardenProviderId
      ) {
        return true;
      }
      if (
        resource.magnet &&
        subjectFile.torrentInfoHash &&
        isSameMagnet(resource.magnet, subjectFile.torrentInfoHash)
      ) {
        return true;
      }
      return false;
    });
    if (related.length > 0) {
      resource.subjectFiles = related;
    }
  }

  return applied;
}

function applyResourcesRewriteRules(
  system: System,
  source: SubjectSource,
  resources: ParsedSubjectResource[]
): ParsedSubjectResource[] {
  for (const rule of source.rewrite) {
    // 1. match resources
    const conditions: ((res: ParsedSubjectResource) => boolean)[] = [];
    if (rule.match.url) {
      const { url } = rule.match;
      conditions.push((res) => url.contain.includes(res.url));
    }
    if (rule.match.fansub) {
      const { fansub } = rule.match;
      conditions.push((res) => {
        if (res.animegarden) {
          if (res.animegarden.fansub && fansub.contain.includes(res.animegarden.fansub?.name)) {
            return true;
          }
        }
        if (res.parsed?.fansub && fansub.contain.includes(res.parsed?.fansub)) {
          return true;
        }
        return false;
      });
    }
    if (rule.match.season) {
      const { season } = rule.match;
      conditions.push((res) => {
        if (isDef(res.parsed.season)) {
          return season.contain.includes(res.parsed.season);
        } else {
          return season.contain.some((s) => !isDef(s));
        }
      });
    }
    if (rule.match.episode) {
      const { episode } = rule.match;
      if ('contain' in episode) {
        const { contain } = episode;
        conditions.push((res) => {
          if (isDef(res.parsed.episode)) {
            return contain.includes(res.parsed.episode);
          } else {
            return contain.some((s) => !isDef(s));
          }
        });
      }
      if ('range' in episode) {
        const { range } = episode;
        conditions.push((res) => {
          if (isDef(res.parsed.episode)) {
            return range[0] <= res.parsed.episode && res.parsed.episode <= range[1];
          } else {
            return false;
          }
        });
      }
    }

    // 2. Apply resources
    const matched =
      conditions.length > 0
        ? resources.filter((r) => conditions.every((c) => c(r)))
        : [...resources];
    for (const res of matched) {
      if (isDef(rule.apply.season)) {
        res.parsed.season = rule.apply.season;
        res.metadata.season = rule.apply.season;
      }
      if (isDef(rule.apply.episode)) {
        res.parsed.episode = rule.apply.episode;
        res.metadata.episode = rule.apply.episode;
      }
      if (isDef(rule.apply.episodeOffset) && isDef(res.parsed.episode)) {
        res.parsed.episode += rule.apply.episodeOffset;
        res.metadata.episode = res.parsed.episode;
      }
    }
  }

  return resources;
}

export async function extractResources(
  system: System,
  subject: Subject,
  resources: ParsedSubjectResource[]
): Promise<ExtractedSubjectResource[]> {
  // 1. Group resources by season and episode, and remove unknown resources
  const extracted = groupResources(subject, resources);

  // 2. Sort each group to select target resource
  for (const resources of extracted.values()) {
    sortResources(subject, resources);
  }
  const selected = [...extracted.values()].map((rs) => rs[0]).filter(Boolean);

  // 3. Sort resources by season and episode
  if (subject.type === SubjectType.TV) {
    selected.sort((lhs, rhs) => {
      if (lhs.extracted.season !== rhs.extracted.season) {
        return lhs.extracted.season - rhs.extracted.season;
      }
      return lhs.extracted.episode - rhs.extracted.episode;
    });
  }

  return selected;
}

export function nameResource(subject: Subject, res: ParsedSubjectResource) {
  const season = res.metadata.season ?? subject.naming.season ?? res.parsed.season ?? 1;
  const episode = res.parsed.episode;
  const fansub = res.parsed.fansub ?? '';
  const year = res.metadata.year ?? subject.naming.year ?? res.parsed.year;
  const month = res.metadata.month ?? subject.naming.month ?? res.parsed.month;

  const template = resolveTemplateByType(res.parsed.type, subject.naming.template);

  const extracted = res as unknown as ExtractedSubjectResource;
  extracted.extracted = {
    type: res.parsed.type,
    filename: '',
    season,
    episode: episode ?? 1,
    fansub,
    year,
    month
  };

  extracted.extracted.filename = renderNamingTemplate(template, {
    name: subject.naming.name,
    season,
    episode,
    fansub,
    year,
    month
  });

  return extracted;
}

function groupResources(
  subject: Subject,
  resources: ParsedSubjectResource[]
): Map<string, ExtractedSubjectResource[]> {
  const group = new Map<string, ExtractedSubjectResource[]>();
  for (const res of resources) {
    if (!res.parsed.episode) continue;

    const extracted = nameResource(subject, res);
    const { season, episode } = extracted.extracted;

    const key =
      subject.type === SubjectType.TV
        ? `S${season < 10 ? '0' + season : season}E${episode < 10 ? '0' + episode : episode}`
        : '';
    if (!group.has(key)) {
      group.set(key, []);
    }

    group.get(key)!.push(extracted);
  }
  return group;
}

function sortResources(subject: Subject, resources: ExtractedSubjectResource[]) {
  const { fansubs = [], keywords = [] } = subject.source.order;

  const getFansubIndex = (res: ExtractedSubjectResource) => {
    const id = fansubs.findIndex((fansub) => fansub === res.extracted.fansub);
    return id !== -1 ? id : Number.MAX_SAFE_INTEGER;
  };

  return resources.sort((lhs, rhs) => {
    // 1. Sort by fansub order
    const fansub1 = getFansubIndex(lhs);
    const fansub2 = getFansubIndex(rhs);
    if (fansub1 !== fansub2) {
      return fansub1 - fansub2;
    }

    // 2. Sort by keywords order
    for (const { keywords: order } of keywords) {
      const li = order.findIndex((k) => lhs.name.toLowerCase().indexOf(k.toLowerCase()) !== -1);
      const ri = order.findIndex((k) => rhs.name.toLowerCase().indexOf(k.toLowerCase()) !== -1);
      if (li !== ri) {
        return li - ri;
      }
    }

    // 3. Fallback to compare name
    return lhs.name.localeCompare(rhs.name);
  });
}
