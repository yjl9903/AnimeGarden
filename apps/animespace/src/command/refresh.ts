import type { Subject } from '../subject/subject.ts';
import type { System, GetSubjectsOptions } from '../system/system.ts';

export async function watchSubjects(system: System, options: GetSubjectsOptions) {
  await system.loadSubjects();
  await system.validate();

  // TODO
}

export async function refreshSubjects(system: System, subjects: Subject[]) {
  await system.validate();

  // TODO
}

export async function introspectSubjects(system: System, subjects: Subject[]) {
  await system.validate();

  // TODO
}
