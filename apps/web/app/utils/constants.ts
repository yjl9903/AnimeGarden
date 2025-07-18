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
  '桜都字幕组',
  '喵萌奶茶屋',
  '魔星字幕团',
  'GMTeam',
  '北宇治字幕组',
  '爱恋字幕社',
  '天使动漫论坛',
  '萝莉社活动室',
  '猎户发布组',
  '极影字幕社',
  'DBD制作组',
  'SweetSub',
  '拨雪寻春',
  '天月動漫&發佈組',
  'VCB-Studio',
  '亿次研同好会',
  '幻樱字幕组',
  '悠哈璃羽字幕社',
  '霜庭云花Sub',
  '霜庭云花',
  '夜莺家族',
  '星空字幕组',
  '雪飄工作室(FLsnow)',
  '云光字幕组',
  '丸子家族',
  '悠哈C9字幕社',
  'Kirara Fantasia',
  '販賣機漢化組',
  '动漫国字幕组',
  '银色子弹字幕组',
  '云歌字幕组',
  '离谱Sub',
  '黑白字幕组',
  '7³ACG',
  '動漫國字幕組',
  '诸神kamigami字幕组',
  '诸神字幕组',
  '织梦字幕组',
  'MingYSub',
  'FSD字幕组',
  '豌豆字幕组',
  '千夏字幕组',
  '百冬練習組',
  '千夏字幕組',
  '風之聖殿字幕組',
  '风车字幕组',
  '梦蓝字幕组',
  '轻之国度字幕组',
  '轻之国度',
  '沸羊羊制作组',
  'NEO·QSW',
  '幻月字幕组',
  '枫叶字幕组',
  '风之圣殿',
  '秋人字幕',
  '秋人摸魚',
  'MCE汉化组',
  '鈴風字幕組',
  '冷番补完字幕组',
  '新sub',
  '哆啦字幕组',
  'Amor字幕组',
  'S1百综字幕组',
  '得宗字幕组×拾月出云',
  '奇怪机翻组',
  'DBFC字幕组',
  'SW字幕组',
  '香子兰翻译同好会',
  '未央阁联盟',
  '澄空学园',
  '柯南事务所',
  'ARIA',
  '无戒汉化组',
  'H-Enc',
  '肥猫压制',
  '提灯喵甄选百合',
  '茉语字幕组',
  '幻之字幕组',
  '三明治摆烂组',
  '咪梦动漫组',
  '森',
  'SRVFI-Raws',
  '漫游字幕组',
  'Niconeiko Works',
  '驯兽师联盟',
  'PorterRAWS',
  '芝士动物朋友',
  '小满云电工作室',
  '无名字幕组',
  '悠久の風',
  '炒冷番字幕组',
  'AI-Raws',
  '物语系列圈',
  '光之家族字幕组',
  '光之园字幕组',
  'lu-ul',
  'TensoRaws',
  'Clarita 压制组',
  '梦奇字幕组',
  'KRL字幕组',
  'AikatsuFans'
];
