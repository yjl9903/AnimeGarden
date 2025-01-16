import { Jieba } from '@node-rs/jieba';
import { dict } from '@node-rs/jieba/dict.js';

import { parse } from 'anipar';
import { normalizeTitle } from '@animegarden/client';

import type { System } from '../system';
import type { NewResource as NewDbResource } from '../schema';

import { SupportProviders } from '../schema/providers';

import type { NewResource } from './types';

const jieba = Jieba.withDict(dict);

export function transformNewResources(
  sys: System,
  res: NewResource
): { result: NewDbResource | undefined; errors?: string[] } {
  const errors = [];

  if (!SupportProviders.includes(res.provider as any)) {
    errors.push(`Unknown provider: ${res.provider}`);
  }

  const titleAlt = normalizeTitle(res.title);
  const size = parseSize(res.size);
  const publisher = sys.modules.users.get(res.publisher);
  const fansub = res.fansub ? sys.modules.teams.get(res.fansub) : undefined;

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
        metadata: {
          ...metadata
        }
      }
    };
  } else {
    return {
      result: undefined,
      errors
    };
  }
}

const KB_RE = /^(\d+(?:\.\d+)?)\s*[Kk][Bb]$/;
const MB_RE = /^(\d+(?:\.\d+)?)\s*[Mm][Bb]$/;
const GB_RE = /^(\d+(?:\.\d+)?)\s*[Gg][Bb]$/;
const TB_RE = /^(\d+(?:\.\d+)?)\s*[Tt][Bb]$/;

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
