import type { GetSubjectOptions, GetSubjectsOptions, System } from '../system/system.ts';

export async function getSubjects(system: System, options: GetSubjectsOptions) {
  await system.loadSubjects();

  const subjects = system.getSubjects();

  return subjects;
}

export async function getSubject(system: System, options: GetSubjectOptions) {
  await system.loadSubjects();

  const subject = system.getSubject(options);
  if (!subject) {
    system.logger.error(`未找到相关动画条目`, options);
    throw new Error(`未找到相关动画条目`);
  }

  return subject;
}
