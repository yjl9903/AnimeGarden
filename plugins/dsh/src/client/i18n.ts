import { playbackEn, playbackZh } from './playback/i18n.js';

/** Dictionary namespace owned by this plugin (shared with the sidebar entry). */
export const NS = 'animegarden';

/** A translate seat bound to one namespace; params fill `{name}` placeholders. */
export type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;

/** One locale's key/value dictionary. */
export type LocaleDictionary = Record<string, string>;

/** Required Client locale service surface. */
export interface LocaleService {
  register(namespace: string, dictionaries: Record<string, LocaleDictionary>): () => void;

  bind(namespace: string): TranslateFunction;
}

/** Context slice needed to register the dictionaries and bind `t`. */
export interface LocaleHost {
  effect(effect: () => (() => void) | void, label?: string): unknown;

  locale: LocaleService;
}

/** Simplified Chinese dictionary (the panel key-set source of truth). */
export const zh: LocaleDictionary = {
  panel: 'Anime Garden',
  title: 'Anime Garden',
  searchPlaceholder: '搜索动画标题，例如：芙莉莲 或 字幕组:喵萌奶茶屋',
  searchLabel: '搜索动画资源',
  filtersLabel: '资源类型筛选',
  calendar: '周历',
  switchToSearch: '搜索',
  history: '浏览历史',
  navBack: '返回',
  navForward: '前进',
  refresh: '刷新',
  'weekday.mon': '周一',
  'weekday.tue': '周二',
  'weekday.wed': '周三',
  'weekday.thu': '周四',
  'weekday.fri': '周五',
  'weekday.sat': '周六',
  'weekday.sun': '周日',
  fansubFilter: '字幕组',
  typeFilter: '类型',
  clear: '清除',
  loadingCalendar: '正在加载周历…',
  emptyCalendar: '这个季度还没有动画数据。',
  'type.anime': '动画',
  'type.collection': '合集',
  'type.music': '音乐',
  'type.drama': '日剧',
  'type.raw': 'RAW',
  'type.manga': '漫画',
  'type.game': '游戏',
  'type.tokusatsu': '特摄',
  'type.other': '其他',
  loading: '正在搜索…',
  empty: '没有找到资源，换个关键词或筛选条件试试。',
  error: '无法获取资源，请检查网络后重试。',
  retry: '重试',
  loadMoreFailed: '资源加载失败',
  endOfList: '已经到底了',
  play: '播放',
  detail: '详情',
  published: '发布于',
  size: '大小',
  openMagnet: '打开磁力链接',
  copyMagnet: '复制磁力链接',
  openMagnetHint: '点击用系统应用打开，Shift/⌘ 点击复制磁力链接',
  openMagnetFailed: '无法打开磁力链接，请确认已安装 BT 客户端',
  toolSearchTitle: '搜索 Anime Garden',
  toolSearchRunning: '正在搜索…',
  toolSearchFound: '找到 {count} 个资源',
  toolSearchEmpty: '没有找到资源',
  toolSearchFailed: '搜索失败',
  'filter.search': '关键词',
  'filter.include': '标题包含',
  'filter.keywords': '必须包含',
  'filter.exclude': '排除',
  'filter.fansubs': '字幕组',
  'filter.publishers': '发布者',
  'filter.types': '类型',
  'filter.subjects': '番剧',
  'filter.provider': '来源',
  'filter.preset': '预设',
  'filter.after': '{date} 之后',
  'filter.before': '{date} 之前',
  'filter.join': '，',
  copyMagnetSuccess: '磁力链接已复制',
  copyMagnetFailed: '复制失败，请手动复制磁力链接',
  ...playbackZh
};

/** English dictionary, checked complete against the zh key set. */
export const en: LocaleDictionary = {
  panel: 'Anime Garden',
  title: 'Anime Garden',
  searchPlaceholder: 'Search titles, e.g. Frieren or 字幕组:喵萌奶茶屋',
  searchLabel: 'Search anime resources',
  filtersLabel: 'Resource type filters',
  calendar: 'Calendar',
  switchToSearch: 'Search',
  history: 'History',
  navBack: 'Back',
  navForward: 'Forward',
  refresh: 'Refresh',
  'weekday.mon': 'Mon',
  'weekday.tue': 'Tue',
  'weekday.wed': 'Wed',
  'weekday.thu': 'Thu',
  'weekday.fri': 'Fri',
  'weekday.sat': 'Sat',
  'weekday.sun': 'Sun',
  fansubFilter: 'Fansub',
  typeFilter: 'Type',
  clear: 'Clear',
  loadingCalendar: 'Loading calendar…',
  emptyCalendar: 'No anime in this season.',
  'type.anime': 'Anime',
  'type.collection': 'Collection',
  'type.music': 'Music',
  'type.drama': 'Japanese drama',
  'type.raw': 'RAW',
  'type.manga': 'Manga',
  'type.game': 'Game',
  'type.tokusatsu': 'Tokusatsu',
  'type.other': 'Other',
  loading: 'Searching…',
  empty: 'No resources found. Try another keyword or filter.',
  error: 'Could not load resources. Check the network and retry.',
  retry: 'Retry',
  loadMoreFailed: 'Failed to load more',
  endOfList: 'No more results',
  play: 'Play',
  detail: 'Details',
  published: 'Published',
  size: 'Size',
  openMagnet: 'Open magnet link',
  copyMagnet: 'Copy magnet link',
  openMagnetHint: 'Click to open in your torrent app; Shift/Cmd-click to copy the link',
  openMagnetFailed: 'Could not open the magnet link. Is a BitTorrent client installed?',
  toolSearchTitle: 'Search Anime Garden',
  toolSearchRunning: 'Searching…',
  toolSearchFound: 'found {count} resources',
  toolSearchEmpty: 'No resources found',
  toolSearchFailed: 'Search failed',
  'filter.search': 'Keyword',
  'filter.include': 'Title contains',
  'filter.keywords': 'Must contain',
  'filter.exclude': 'Exclude',
  'filter.fansubs': 'Fansub',
  'filter.publishers': 'Publisher',
  'filter.types': 'Type',
  'filter.subjects': 'Bangumi',
  'filter.provider': 'Source',
  'filter.preset': 'Preset',
  'filter.after': 'after {date}',
  'filter.before': 'before {date}',
  'filter.join': ', ',
  copyMagnetSuccess: 'Magnet link copied',
  copyMagnetFailed: 'Copy failed, copy the magnet link manually',
  ...playbackEn
};

/**
 * Register both dictionaries on the plugin context and bind the namespace.
 * @param ctx - Client plugin context owning the registration lifetime.
 * @returns the `t(key, params?)` seat for this namespace.
 */
export function registerLocale(ctx: LocaleHost): TranslateFunction {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'animegarden: dictionaries');
  return ctx.locale.bind(NS);
}
