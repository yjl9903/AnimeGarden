import { Token } from '../token';

import { ParserContext } from './context';

export function matchVolumePatterns(context: ParserContext, word: string, token: Token) {
  return true;
}

export function setVolumeNumber(
  context: ParserContext,
  word: string,
  token: Token,
  validate: boolean
) {
  return true;
}
