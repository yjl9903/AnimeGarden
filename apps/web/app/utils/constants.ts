import type { PresetType } from '@animegarden/client';

export const PRESET_DISPLAY_NAME: Record<PresetType, string> = {
  bangumi: '番剧'
};

export const types = ['动画', '合集', '音乐', '日剧', 'RAW', '漫画', '游戏', '特摄', '其他'];

// @unocss-include
export const DisplayTypeColor: Record<string, string> = {
  动画: 'text-red-600',
  合集: 'text-[#ff0000]',
  漫画: 'text-green-600',
  音乐: 'text-purple-600',
  日剧: 'text-blue-600',
  RAW: 'text-[#ffa500]',
  游戏: 'text-[#0eb9e7]',
  特摄: 'text-[#a52a2a]',
  其他: 'text-base-800'
};

// Generate by this SQL:
// WITH recent_articles AS (
//   SELECT fansub_id, COUNT(*) AS article_count
//   FROM resources
//   WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
//   GROUP BY fansub_id
// )
// SELECT u.*, ra.article_count
// FROM teams u
// JOIN recent_articles ra ON u.id = ra.fansub_id
// ORDER BY ra.article_count DESC;

export const fansubs = [
  'ANi',
  'LoliHouse',
  '喵萌奶茶屋',
  'Prejudice-Studio',
  '绿茶字幕组',
  '桜都字幕组',
  '雪飄工作室(FLsnow)',
  '三明治摆烂组',
  '北宇治字幕组',
  '魔星字幕团',
  '拨雪寻春',
  '爱恋字幕社',
  'SweetSub',
  '樱桃花字幕组&sakura-hana',
  '千夏字幕组',
  '沸班亚马制作组',
  '动漫国字幕组',
  '天月動漫&發佈組',
  '猎户发布组',
  '天使动漫论坛',
  '幻樱字幕组',
  '六四位元字幕組',
  '悠哈璃羽字幕社',
  'DBD制作组',
  'TSDM字幕組',
  '百冬練習組',
  'GMTeam',
  '银色子弹字幕组',
  'VCB-Studio',
  '夜莺家族',
  '亿次研同好会',
  '丸子家族',
  '风之圣殿',
  '云光字幕组',
  '黑白字幕组',
  '驯兽师联盟',
  '星空字幕组',
  '极影字幕社',
  'MingYSub',
  'H-Enc',
  '离谱Sub',
  '云歌字幕组',
  'PorterRAWS',
  '豌豆字幕组',
  '隣天使字幕组',
  'Kirara Fantasia'
];
