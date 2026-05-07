import bgmd from 'bgmd' with { type: 'json' };

const subjectMap = new Map(bgmd.subjects.map((s) => [s.id, s]));

export function getSubjectById(subjectId: number) {
  return subjectMap.get(subjectId);
}
