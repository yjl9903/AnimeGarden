import { parse } from 'anipar';
import { SupportProviders, normalizeTitle } from '@animegarden/client';

import type { System } from '../system';
import type { NewResource as NewDbResource, Team, User } from '../schema';

import { jieba } from '../utils';

import type { InsertResourcesOptions, NewResource } from './types';

export function transformNewResources(
  sys: System,
  res: NewResource,
  options: InsertResourcesOptions
): { result: NewDbResource | undefined; errors?: string[] } {
  const { indexSubject = true } = options;

  const errors = [];

  if (!SupportProviders.includes(res.provider as any)) {
    errors.push(`Unknown provider: ${res.provider}`);
  }

  const titleAlt = normalizeTitle(res.title);
  const size = Math.floor(parseSize(res.size));
  const publisher = sys.modules.users.getByName(res.publisher);
  const fansub = res.fansub ? sys.modules.teams.getByName(res.fansub) : undefined;

  if (!publisher) {
    errors.push(`Unknown publisher: ${res.publisher}`);
  }
  if (res.fansub && !fansub) {
    errors.push(`Unknown fansub: ${res.fansub}`);
  }

  if (errors.length === 0) {
    const anipar = parse(titleAlt);
    const metadata: Record<string, any> = {};
    if (anipar) {
      metadata.anipar = anipar;
    }

    const titleSearch = [
      anipar
        ? jieba
            .cut(anipar.title, false)
            .map((t) => t.trim())
            .filter(Boolean)
        : undefined,
      undefined,
      undefined,
      jieba
        .cut(titleAlt, false)
        .map((t) => t.trim())
        .filter(Boolean)
    ];

    return {
      result: {
        provider: res.provider as NewDbResource['provider'],
        providerId: res.providerId,
        title: res.title,
        titleAlt,
        titleSearch,
        href: res.href,
        type: res.type,
        magnet: res.magnet,
        tracker: res.tracker,
        size: !Number.isNaN(size) ? size : 0,
        createdAt: res.createdAt,
        fetchedAt: res.fetchedAt ?? new Date(),
        publisherId: publisher!.id,
        fansubId: fansub?.id,
        subjectId: indexSubject ? matchActiveSubjects(sys, titleAlt) : null,
        metadata: {
          ...metadata
        },
        isDeleted: res.isDeleted ?? false
      }
    };
  } else {
    return {
      result: undefined,
      errors
    };
  }
}

const KB_RE = /^(\d+(?:\.\d+)?)\s*[Kk]i?[Bb]$/;
const MB_RE = /^(\d+(?:\.\d+)?)\s*[Mm]i?[Bb]$/;
const GB_RE = /^(\d+(?:\.\d+)?)\s*[Gg]i?[Bb]$/;
const TB_RE = /^(\d+(?:\.\d+)?)\s*[Tt]i?[Bb]$/;

function parseSize(size: string) {
  if (!size) return 0;
  try {
    const kb = KB_RE.exec(size);
    if (kb) {
      return +kb[1];
    }
    const mb = MB_RE.exec(size);
    if (mb) {
      return +mb[1] * 1024;
    }
    const gb = GB_RE.exec(size);
    if (gb) {
      return +gb[1] * 1024 * 1024;
    }
    const tb = TB_RE.exec(size);
    if (tb) {
      return +tb[1] * 1024 * 1024 * 1024;
    }

    const byte = Number.parseInt(size);
    return byte;
  } catch {
    return 0;
  }
}

function matchActiveSubjects(sys: System, titleAlt: string) {
  const active = sys.modules.subjects.activeSubjects;
  const title = titleAlt.toLowerCase();
  for (const sub of active) {
    for (const key of sub.keywords) {
      if (title.indexOf(key.toLowerCase()) !== -1) {
        return sub.id;
      }
    }
  }
  return null;
}

export function transformDatabaseUser(user?: User | Team) {
  if (!user) return undefined;

  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar
  };
}
