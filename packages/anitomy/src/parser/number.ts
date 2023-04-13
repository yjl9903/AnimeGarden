import { KeywordManager } from '../keyword';
import { ElementCategory } from '../element';
import { Token, TokenCategory } from '../token';

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

// export function searchForEpisodePatterns(tokens: Token[]) {
//   for (const token of tokens) {
//     const numericFront = token.content.length > 0 && /0-9/.test(token.content[0]);

//     if (!numericFront) {
//     } else {
//     }
//   }
// }

// function numberComesAfterPrefix(category: ElementCategory, token: Token) {
//   const numberBegin = indexOfDigit(token.content);
//   const prefix = KeywordManager.normalize(token.content.slice(0, numberBegin));
//   if (KeywordManager.contains(category, prefix)) return undefined;

//   const number = token.content.slice(numberBegin);
//   switch (category) {
//     case ElementCategory.EpisodePrefix:
//       if (!matchEpisodePatterns(number, token)) {
//       }
//       return true;
//     case ElementCategory.VolumePrefix:
//       return true;
//     default:
//       return undefined;
//   }
// }

// function getEpisodeNumber(num: string, token: Token, validate: boolean) {
//   if (validate && !isValidEpisodeNumber(num)) return false;

//   token.category = TokenCategory.Identifier;
//   const category = ElementCategory.EpisodeNumber;
// }

export function isValidEpisodeNumber(num: string) {
  const temp = [];
  for (let i = 0; i < num.length && /0-9/.test(num[i]); i++) {
    temp.push(num[i]);
  }
  return temp.length > 0 && parseFloat(temp.join('')) <= EpisodeNumberMax;
}
