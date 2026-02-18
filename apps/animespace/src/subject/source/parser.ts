import { parse } from 'anipar';

import type { Subject } from '../subject.ts';

import type { ParsedSubjectResource, SubjectResource } from './resource.ts';

export function parseResource(subject: Subject, resource: SubjectResource): ParsedSubjectResource {
  const parsed = resource as unknown as ParsedSubjectResource;

  const info = parse(resource.name);
  if (info) {
    parsed.parsed = {
      type: resource.metadata.type ?? subject.type, // TODO: infer type
      season: resource.metadata.season ?? info.season?.number,
      episode: resource.metadata.episode ?? info.episode?.number,
      fansub:
        resource.metadata.fansub ??
        (typeof info.fansub === 'object' ? info.fansub?.name : info.fansub),
      year: resource.metadata.year ?? info.year,
      month: resource.metadata.month ?? info.month
    };
  } else {
    parsed.parsed = {
      type: subject.type,
      ...resource.metadata
    };
  }

  return parsed;
}
