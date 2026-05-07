import { Fansub } from 'anipar';

// 白名单控制推送入口
const ALLOW_FANSUBS = new Set([
  Fansub.ANi,
  Fansub.LoliHouse,
  Fansub.绿茶字幕组,
  Fansub.桜都字幕组,
  Fansub.Prejudice_Studio,
  Fansub.喵萌奶茶屋,
  Fansub.雪飄工作室,
  Fansub.三明治摆烂组
]);

export function shouldSendFansubResource(fansub: string) {
  return ALLOW_FANSUBS.has(fansub);
}

export function shouldSendTypeResource(type: string) {
  return type === '动画';
}
