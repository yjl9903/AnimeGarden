import type { ParseResult } from 'anipar';
import type { BasicSubject } from 'bgmd';

import { type Bot } from 'grammy';
import { tradToSimple } from 'simptrad';
import { formatInTimeZone } from 'date-fns-tz';

import type { SystemOptions } from '../system/system.ts';
import type { FoundResource } from '../resources/query.ts';

import { getKeepShareURL } from '../utils/keepshare.ts';

/**
 * Telegram photo caption format:
 *
 * #SubjectName #yyyy年1/4/7/10月新番
 * <b>SubjectName · 第 x 集</b>
 * #Fansub1 #Fansub2
 * <b>字幕:</b> 简中 / 繁中 · 内封字幕
 * <b>格式:</b> 1080p · AVC-10-bit · 24fps · mp4 · AAC
 * <b>大小:</b> 499.18 MB
 * <b>发布:</b> 2026 年 5 月 7 日 13:00
 * <b>追踪:</b> #Fansub_SubjectName
 * <a href="...">查看详情</a> · <a href="...">在线播放</a>
 */
export function buildResourceCardMessage(
  resource: FoundResource,
  subject: BasicSubject,
  parsed: ParseResult,
  options: Pick<SystemOptions, 'site' | 'keepshare'> = {}
) {
  const detailUrl = getResourceDetailUrl(resource, options.site);
  const magnetUrl = resource.magnet + (resource.tracker ?? '');
  const playUrl = getKeepShareURL(options.keepshare, magnetUrl);
  const subjectName = subject.title;
  const lines = [
    `${formatHashTag(subjectName)} ${formatHashTag(formatQuarter(subject, resource))}`,
    formatTitleLine(subjectName, parsed),
    formatFansubs(parsed),
    formatSubtitleLine(parsed),
    formatVideoLine(parsed),
    formatResourceSize(resource.size),
    formatPublishTime(resource.createdAt),
    formatLabels(parsed, subjectName),
    `<a href="${escapeHtml(detailUrl)}">查看详情</a> · <a href="${escapeHtml(playUrl)}">在线播放</a>`
  ].filter(Boolean);

  const messageOptions = {
    parse_mode: 'HTML'
  } satisfies NonNullable<Parameters<Bot['api']['sendPhoto']>[2]>;

  return {
    photo: subject.poster,
    text: lines.join('\n'),
    options: messageOptions
  };
}

function formatTitleLine(subjectName: string, parsed: ParseResult) {
  const episode = formatEpisode(parsed);
  return `<b>${escapeHtml(subjectName)}${episode ? ` · ${escapeHtml(episode)}` : ''}</b>`;
}

export function getResourceDetailUrl(
  resource: Pick<FoundResource, 'provider' | 'providerId'>,
  site?: string
) {
  return `https://${site ?? 'animes.garden'}/detail/${resource.provider}/${resource.providerId}`;
}

function formatEpisode(parsed: ParseResult) {
  if (parsed.episodesRange) {
    return `第 ${formatEpisodeNumber(parsed.episodesRange.from, parsed.episodesRange.fromSub)}-${formatEpisodeNumber(parsed.episodesRange.to, parsed.episodesRange.toSub)} 集`;
  }
  if (parsed.episodes?.length) {
    return `第 ${parsed.episodes.map((episode) => formatEpisodeNumber(episode.number, episode.numberSub)).join(',')} 集`;
  }
  if (parsed.episode) {
    return `第 ${formatEpisodeNumber(parsed.episode.number, parsed.episode.numberSub)} 集`;
  }
  return undefined;
}

function formatEpisodeNumber(number: number, numberSub?: number) {
  return numberSub !== undefined ? `${number}.${numberSub}` : `${number}`;
}

function formatFansubs(parsed: ParseResult) {
  const fansubs = getNormalizedFansubs(parsed);
  if (fansubs.length === 0) return undefined;
  return fansubs.map((fansub) => escapeHtml(formatHashTag(fansub))).join(' ');
}

function getNormalizedFansubs(parsed: ParseResult) {
  return [
    ...new Set(
      [parsed.fansub?.name, ...(parsed.fansub?.collab ?? [])]
        .filter(Boolean)
        .map((fansub) => normalizeFansubName(fansub!))
    )
  ];
}

function normalizeFansubName(name: string) {
  const simplified = tradToSimple(name);
  const compacted = simplified.replace(/[\s_\-()（）]/g, '').toLowerCase();

  if (compacted === 'flsnow' || compacted === '雪飘工作室flsnow') {
    return '雪飘工作室';
  }
  if (compacted === 'nekomoekissaten' || compacted === '喵萌奶茶屋') {
    return '喵萌奶茶屋';
  }
  return simplified;
}

function formatSubtitleLine(parsed: ParseResult) {
  if (!parsed.subtitle) return undefined;

  const parts = [formatSubtitleLanguages(parsed.subtitle), formatSubtitle(parsed.subtitle)].filter(
    Boolean
  );
  if (parts.length === 0) return undefined;
  return `<b>字幕:</b> ${parts.map((part) => escapeHtml(part!)).join(' · ')}`;
}

function formatVideoLine(parsed: ParseResult) {
  const parts = [
    parsed.file?.video?.resolution ? formatResolution(parsed.file.video.resolution) : undefined,
    formatVideoCodec(parsed),
    parsed.file?.video?.fps,
    formatContainer(parsed),
    parsed.file?.audio?.codec
  ].filter(Boolean);
  if (parts.length === 0) return undefined;
  return `<b>格式:</b> ${parts.map((part) => escapeHtml(part!)).join(' · ')}`;
}

function formatVideoCodec(parsed: ParseResult) {
  const codec = parsed.file?.video?.codec;
  const bitDepth = parsed.file?.video?.bitDepth;
  if (codec && bitDepth) return `${codec}-${bitDepth}`;
  return codec ?? bitDepth;
}

function formatContainer(parsed: ParseResult) {
  return (parsed.file?.extension ?? parsed.file?.video?.format)?.toLowerCase();
}

function formatResolution(resolution: string) {
  const size = /^(\d+)x(\d+)$/i.exec(resolution);
  if (size) return `${size[2]}p`;
  return resolution;
}

function formatSubtitleLanguages(subtitle: NonNullable<ParseResult['subtitle']>) {
  const languages = subtitle.languages?.map((lang) => {
    if (lang === '简') return '简中';
    if (lang === '繁') return '繁中';
    if (lang === '日') return '日语';
    if (lang === '英') return '英语';
    return lang;
  });
  return languages?.join(' / ');
}

function formatSubtitle(subtitle: NonNullable<ParseResult['subtitle']>) {
  return subtitle.format ? normalizeSubtitleFormat(subtitle.format) : undefined;
}

function normalizeSubtitleFormat(format: string) {
  if (format === '内嵌') return '内嵌字幕';
  if (format === '内封') return '内封字幕';
  if (format === '外挂') return '外挂字幕';
  return format;
}

function formatResourceSize(size: number) {
  const label = '<b>大小:</b> ';
  if (size <= 0) return label + '未知';
  if (size < 1024) return label + `${size} KB`;
  if (size < 1024 * 1024) return label + `${(size / 1024).toFixed(2)} MB`;
  return label + `${(size / 1024 / 1024).toFixed(2)} GB`;
}

function formatPublishTime(value: string) {
  return `<b>发布:</b> ${formatInTimeZone(new Date(value), 'Asia/Shanghai', 'yyyy 年 M 月 d 日 HH:mm')}`;
}

function formatLabels(parsed: ParseResult, subjectName: string) {
  const fansub = getNormalizedFansubs(parsed)[0];
  if (!fansub) return undefined;
  return `<b>追踪:</b> ${formatHashTag(`${fansub}_${subjectName}`)}`;
}

function formatQuarter(subject: BasicSubject, resource: FoundResource) {
  const date = new Date(subject.onair_date || resource.createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const quarterMonth = Math.floor(date.getMonth() / 3) * 3 + 1;
  return `${year}年${quarterMonth}月新番`;
}

function formatHashTag(text: string) {
  const normalized = text.replace(/[^\p{L}\p{N}_]/gu, '');
  return normalized ? `#${normalized}` : '';
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
