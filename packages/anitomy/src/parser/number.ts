import { ParserContext } from './context';

export const AnimeYearMin = 1900;
export const AnimeYearMax = 2100;
export const EpisodeNumberMax = AnimeYearMax - 1;
export const VolumeNumberMax = 50;

export function indexOfDigit(str: string) {
  for (let i = 0; i < str.length; i++) {
    if (isDigit(str[i])) {
      return i;
    }
  }
  return -1;
}

export function isDigit(str: string) {
  return /^[0-9]$/.test(str);
}

export function searchForEquivalentNumbers(context: ParserContext, tokens: number[]) {
  return false;
}

export function searchForSeparatedNumbers(context: ParserContext, tokens: number[]) {
  return false;
}

export function searchForIsolatedEpisodeNumber(context: ParserContext, tokens: number[]) {
  return false;
}

export function searchForLastNumber(context: ParserContext, tokens: number[]) {
  return false;
}

export function isValidEpisodeNumber(num: string) {
  const temp = [];
  for (let i = 0; i < num.length && /[0-9\.]/.test(num[i]); i++) {
    temp.push(num[i]);
  }
  return temp.length > 0 && parseFloat(temp.join('')) <= EpisodeNumberMax;
}
