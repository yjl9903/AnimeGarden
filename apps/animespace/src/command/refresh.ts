import type { Subject } from '../subject/subject.ts';
import type { System, GetSubjectsOptions, RefreshOptions } from '../system/system.ts';

export async function refreshSubjects(
  system: System,
  subjects: Subject[],
  options: RefreshOptions = {}
) {
  await system.validate();

  // TODO
}

export async function introspectSubjects(system: System, subjects: Subject[]) {
  await system.validate();

  // TODO
}
