import { ElementCategory } from '../element';
import { Token, TokenCategory } from '../token';

export function isCRC32(str: string) {
  return /^[0-9a-fA-F]{8}$/.test(str);
}

export function isResolution(str: string) {
  // 1. ###x###
  // 2. ###p / ###P
  return /^\d{3,4}([pP]|[xX\u00D7]\d{3,4})/.test(str);
}

const SearchableElementCategories = new Set([
  ElementCategory.AnimeSeasonPrefix,
  ElementCategory.AnimeType,
  ElementCategory.AudioTerm,
  ElementCategory.DeviceCompatibility,
  ElementCategory.EpisodePrefix,
  ElementCategory.FileChecksum,
  ElementCategory.FileExtension,
  ElementCategory.Language,
  ElementCategory.Other,
  ElementCategory.ReleaseGroup,
  ElementCategory.ReleaseInformation,
  ElementCategory.ReleaseVersion,
  ElementCategory.Source,
  ElementCategory.Subtitles,
  ElementCategory.VideoResolution,
  ElementCategory.VideoTerm,
  ElementCategory.VolumePrefix
]);
export function isElementCategorySearchable(category: ElementCategory) {
  return SearchableElementCategories.has(category);
}

const SingularElementCategories = new Set([
  ElementCategory.AnimeSeason,
  ElementCategory.AnimeType,
  ElementCategory.AudioTerm,
  ElementCategory.DeviceCompatibility,
  ElementCategory.EpisodeNumber,
  ElementCategory.Language,
  ElementCategory.Other,
  ElementCategory.ReleaseInformation,
  ElementCategory.Source,
  ElementCategory.VideoTerm
]);
export function isElementCategorySingular(category: ElementCategory) {
  return !SingularElementCategories.has(category);
}

const Ordinals = new Map([
  ['1st', '1'],
  ['First', '1'],
  ['2nd', '2'],
  ['Second', '2'],
  ['3rd', '3'],
  ['Third', '3'],
  ['4th', '4'],
  ['Fourth', '4'],
  ['5th', '5'],
  ['Fifth', '5'],
  ['6th', '6'],
  ['Sixth', '6'],
  ['7th', '7'],
  ['Seventh', '7'],
  ['8th', '8'],
  ['Eighth', '8'],
  ['9th', '9'],
  ['Ninth', '9']
]);
export function getNumberFromOrdinal(str: string) {
  return Ordinals.has(str) ? Ordinals.get(str)! : undefined;
}

export function isMatchTokenCategory(category: TokenCategory, token: Token | undefined) {
  return token?.category === category;
}

const Dashes = '-\u2010\u2011\u2012\u2013\u2014\u2015';
export function isDashCharacter(c: string) {
  return c.length === 1 && Dashes.includes(c);
}
