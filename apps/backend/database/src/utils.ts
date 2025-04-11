import { Jieba } from '@node-rs/jieba';
import { dict } from '@node-rs/jieba/dict.js';

export const jieba = Jieba.withDict(dict);

export async function retryFn<T>(fn: () => Promise<T>, count: number): Promise<T> {
  if (count < 0) {
    count = Number.MAX_SAFE_INTEGER;
  }
  let e: any;
  for (let i = 0; i <= count; i++) {
    try {
      return await fn();
    } catch (err) {
      e = err;
    }
  }
  throw e;
}

export function splitOnce(text: string, separator: string): [string, string] {
  const found = text.indexOf(separator);
  if (found === -1) {
    return [text, ''];
  }
  const first = text.slice(0, found);
  const second = text.slice(found);
  return [first, second];
}

export function nextTick() {
  return new Promise<void>((resolve) => process.nextTick(resolve));
}

export function removePunctuations(input: string, replaceValue = ' '): string {
  return input.replace(/[\p{P}\p{S}]/gu, replaceValue);
}
