import { bangumis } from 'bgmd';

const map = new Map(bangumis.map((bgm) => [bgm.id, bgm]));

export function getSubjectById(id: number) {
  return map.get(id);
}
