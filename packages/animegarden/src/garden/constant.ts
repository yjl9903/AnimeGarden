import { tradToSimple } from 'simptrad';

export const QueryType: Record<string, string> = {
  动画: '動畫',
  季度全集: '季度全集',
  音乐: '音樂',
  动漫音乐: '動漫音樂',
  同人音乐: '同人音樂',
  流行音乐: '流行音樂',
  日剧: '日劇',
  RAW: 'ＲＡＷ',
  其他: '其他',
  漫画: '漫畫',
  港台原版: '港台原版',
  日文原版: '日文原版',
  游戏: '遊戲',
  电脑游戏: '電腦遊戲',
  主机游戏: '電視遊戲',
  掌机游戏: '掌機遊戲',
  '网络游戏 ': '網絡遊戲',
  游戏周边: '遊戲周邊',
  特摄: '特攝'
};

export const AllFansubs = [
  {
    id: 18,
    name: '動漫花園字幕組'
  },
  {
    id: 22,
    name: '音樂@花園'
  },
  {
    id: 24,
    name: 'ReSeeD@花園'
  },
  {
    id: 27,
    name: '星组@花園'
  },
  {
    id: 28,
    name: '楓組@花園'
  },
  {
    id: 29,
    name: 'T3@花園'
  },
  {
    id: 30,
    name: '光之字幕組'
  },
  {
    id: 31,
    name: '卡通空間'
  },
  {
    id: 32,
    name: 'SOSG字幕团'
  },
  {
    id: 34,
    name: '楓雪連載製作'
  },
  {
    id: 36,
    name: '流鳴聯合本居'
  },
  {
    id: 37,
    name: '雪飄工作室(FLsnow)'
  },
  {
    id: 40,
    name: '伊妹兒字幕組'
  },
  {
    id: 41,
    name: 'HKG字幕組'
  },
  {
    id: 44,
    name: '08MV小隊'
  },
  {
    id: 45,
    name: '靈風FOSKY工作室'
  },
  {
    id: 47,
    name: '爱恋字幕社'
  },
  {
    id: 49,
    name: '华盟字幕社'
  },
  {
    id: 51,
    name: "I've工作室"
  },
  {
    id: 52,
    name: '中國動物園'
  },
  {
    id: 53,
    name: 'KFC特創組'
  },
  {
    id: 54,
    name: 'MC日劇字幕組(MCS)'
  },
  {
    id: 57,
    name: '月光恋曲字幕组'
  },
  {
    id: 58,
    name: '澄空学园'
  },
  {
    id: 59,
    name: 'X2字幕組'
  },
  {
    id: 60,
    name: 'W-zone字幕组'
  },
  {
    id: 63,
    name: '琵琶行字幕组'
  },
  {
    id: 66,
    name: 'GZone Anime'
  },
  {
    id: 70,
    name: 'JPOPPV联盟'
  },
  {
    id: 71,
    name: 'OUR字幕组'
  },
  {
    id: 72,
    name: '狼集字幕组'
  },
  {
    id: 75,
    name: '柯南事务所'
  },
  {
    id: 76,
    name: '#CHAT RUMBLE#'
  },
  {
    id: 77,
    name: 'H&C推广站'
  },
  {
    id: 78,
    name: '安達充主題論壇'
  },
  {
    id: 79,
    name: 'NGMFans'
  },
  {
    id: 81,
    name: '永恒动漫'
  },
  {
    id: 82,
    name: '3DH字幕组'
  },
  {
    id: 83,
    name: '雪月字幕組'
  },
  {
    id: 86,
    name: '漫娱论坛'
  },
  {
    id: 88,
    name: '动音漫影'
  },
  {
    id: 89,
    name: '漫翔字幕組'
  },
  {
    id: 90,
    name: '恶魔岛字幕组'
  },
  {
    id: 92,
    name: 'VGMU'
  },
  {
    id: 94,
    name: 'C2Club'
  },
  {
    id: 95,
    name: 'JPSEEK'
  },
  {
    id: 96,
    name: '清風朔鈴'
  },
  {
    id: 99,
    name: 'DMS字幕组'
  },
  {
    id: 103,
    name: '竹零字幕'
  },
  {
    id: 104,
    name: '动漫先锋'
  },
  {
    id: 105,
    name: '天の字幕組'
  },
  {
    id: 106,
    name: '唯易字幕组'
  },
  {
    id: 110,
    name: '天香字幕社'
  },
  {
    id: 113,
    name: 'Lost Summer工作室'
  },
  {
    id: 117,
    name: '動漫花園'
  },
  {
    id: 119,
    name: '月舞字幕组'
  },
  {
    id: 122,
    name: '樱の萌字幕组'
  },
  {
    id: 124,
    name: '流云字幕组'
  },
  {
    id: 128,
    name: '牧云字幕组'
  },
  {
    id: 129,
    name: '动漫之家'
  },
  {
    id: 131,
    name: 'Tsubasa字幕组'
  },
  {
    id: 133,
    name: '天幻字幕组'
  },
  {
    id: 134,
    name: '漫游字幕组'
  },
  {
    id: 137,
    name: 'SOSROOM字幕组'
  },
  {
    id: 138,
    name: '动漫怨念屋'
  },
  {
    id: 140,
    name: '中国废柴协会'
  },
  {
    id: 141,
    name: 'WOLF字幕组'
  },
  {
    id: 142,
    name: '空境字幕组'
  },
  {
    id: 145,
    name: '狗狗制作组'
  },
  {
    id: 146,
    name: '幻境字幕社'
  },
  {
    id: 147,
    name: '奥盟字幕组'
  },
  {
    id: 148,
    name: 'S.T.R.SubFans'
  },
  {
    id: 151,
    name: '悠哈C9字幕社'
  },
  {
    id: 152,
    name: '雪铃动漫组'
  },
  {
    id: 153,
    name: '空岛字幕组'
  },
  {
    id: 154,
    name: 'KPDM字幕组'
  },
  {
    id: 157,
    name: '曙光社字幕组'
  },
  {
    id: 161,
    name: '悠久の風'
  },
  {
    id: 162,
    name: '水晶海汉化组'
  },
  {
    id: 163,
    name: '四叶星字幕组'
  },
  {
    id: 165,
    name: '御宅梦域'
  },
  {
    id: 167,
    name: '回风汉化组'
  },
  {
    id: 168,
    name: '木木工作室'
  },
  {
    id: 178,
    name: '散漫字幕组'
  },
  {
    id: 179,
    name: '夕唯工作室'
  },
  {
    id: 185,
    name: '极影字幕社'
  },
  {
    id: 191,
    name: '炎鸟字幕组'
  },
  {
    id: 193,
    name: 'TAMASHII字幕組'
  },
  {
    id: 195,
    name: '幻樱砂之团(SCST)'
  },
  {
    id: 196,
    name: '空翼字幕组'
  },
  {
    id: 197,
    name: '◆漫游FREEWIND工作室'
  },
  {
    id: 198,
    name: '梦幻旋律♪发布组'
  },
  {
    id: 199,
    name: '学院字幕组'
  },
  {
    id: 200,
    name: '狮王汉化组'
  },
  {
    id: 202,
    name: '量子動漫组'
  },
  {
    id: 206,
    name: '酢浆草协会'
  },
  {
    id: 207,
    name: 'BDC字幕组'
  },
  {
    id: 209,
    name: '忘忧字幕组'
  },
  {
    id: 210,
    name: '动萌字幕组'
  },
  {
    id: 211,
    name: '蔷薇园动漫'
  },
  {
    id: 214,
    name: '夜露思苦漢化組'
  },
  {
    id: 215,
    name: 'ACT-SUB'
  },
  {
    id: 216,
    name: '抽风字幕组'
  },
  {
    id: 217,
    name: 'AQUA工作室'
  },
  {
    id: 218,
    name: 'RP工作室'
  },
  {
    id: 221,
    name: '无损疯人组'
  },
  {
    id: 222,
    name: 'A.I.R.nesSub'
  },
  {
    id: 223,
    name: 'DA同音爱漫'
  },
  {
    id: 224,
    name: '绯空字幕社'
  },
  {
    id: 225,
    name: '鈴風字幕組'
  },
  {
    id: 226,
    name: '黑博物館'
  },
  {
    id: 227,
    name: '卡萌动漫'
  },
  {
    id: 228,
    name: 'KRL字幕组'
  },
  {
    id: 230,
    name: '翼の堂字幕组'
  },
  {
    id: 231,
    name: '冰封字幕组'
  },
  {
    id: 234,
    name: '动漫FANS字幕组'
  },
  {
    id: 237,
    name: '樱花飞舞字幕组'
  },
  {
    id: 238,
    name: '音の谜森'
  },
  {
    id: 240,
    name: 'VAXVA'
  },
  {
    id: 241,
    name: '幻樱字幕组'
  },
  {
    id: 244,
    name: '指尖奶茶应援会'
  },
  {
    id: 245,
    name: '星期五字幕组'
  },
  {
    id: 248,
    name: 'GCF字幕組'
  },
  {
    id: 249,
    name: 'YYeTs日翻组'
  },
  {
    id: 250,
    name: '天籁字幕社'
  },
  {
    id: 251,
    name: '腹黑联盟'
  },
  {
    id: 252,
    name: '萌楼字幕组'
  },
  {
    id: 253,
    name: '步姐動漫'
  },
  {
    id: 254,
    name: '神创资源组'
  },
  {
    id: 256,
    name: '露西弗工作室'
  },
  {
    id: 257,
    name: '6d字幕社'
  },
  {
    id: 260,
    name: '魔影字幕组'
  },
  {
    id: 261,
    name: '未来风ACG'
  },
  {
    id: 263,
    name: '光荣字幕组'
  },
  {
    id: 264,
    name: '萌之音交流論壇'
  },
  {
    id: 265,
    name: '绝望御宅发布组'
  },
  {
    id: 267,
    name: '伊恋字幕社'
  },
  {
    id: 268,
    name: '2KF資源發佈組'
  },
  {
    id: 269,
    name: '复活城&猫咪'
  },
  {
    id: 270,
    name: '交响梦工坊'
  },
  {
    id: 271,
    name: '异域动漫'
  },
  {
    id: 273,
    name: '漫友之家压制组'
  },
  {
    id: 274,
    name: '三元色字幕组'
  },
  {
    id: 275,
    name: '漫游连载组PSS'
  },
  {
    id: 276,
    name: '萌之萝莉'
  },
  {
    id: 277,
    name: '萌音字幕组'
  },
  {
    id: 279,
    name: '霜月字幕組'
  },
  {
    id: 281,
    name: '伪世界汉化组'
  },
  {
    id: 282,
    name: 'HKACG字幕組'
  },
  {
    id: 283,
    name: '千夏字幕组'
  },
  {
    id: 284,
    name: '御宅领域'
  },
  {
    id: 285,
    name: '叶隐字幕组'
  },
  {
    id: 286,
    name: '樱雨学园'
  },
  {
    id: 288,
    name: '诸神kamigami字幕组'
  },
  {
    id: 289,
    name: '愛班漫畫社'
  },
  {
    id: 290,
    name: '人人影视发布组'
  },
  {
    id: 293,
    name: '天使字幕組'
  },
  {
    id: 294,
    name: 'BTC-Distro'
  },
  {
    id: 295,
    name: '星空网'
  },
  {
    id: 297,
    name: '爱恋研修社'
  },
  {
    id: 298,
    name: 'YYK字幕组'
  },
  {
    id: 299,
    name: '星光字幕组'
  },
  {
    id: 300,
    name: '咖啡字幕組'
  },
  {
    id: 301,
    name: '忍术学园'
  },
  {
    id: 302,
    name: '依缘字幕组'
  },
  {
    id: 303,
    name: '动漫国字幕组'
  },
  {
    id: 305,
    name: '夜明琉璃字幕社'
  },
  {
    id: 306,
    name: '中国龙珠论坛'
  },
  {
    id: 307,
    name: 'masora字幕組'
  },
  {
    id: 308,
    name: '漫友之家字幕组'
  },
  {
    id: 309,
    name: '草莓工作組'
  },
  {
    id: 310,
    name: '超盟字幕组'
  },
  {
    id: 311,
    name: '暮秋夏夜の部屋'
  },
  {
    id: 312,
    name: '动漫花园动音组'
  },
  {
    id: 313,
    name: '四魂制作组'
  },
  {
    id: 314,
    name: 'S群字幕組'
  },
  {
    id: 315,
    name: '动漫御宅'
  },
  {
    id: 316,
    name: '3DM动漫组'
  },
  {
    id: 317,
    name: '謎之聲字幕組'
  },
  {
    id: 319,
    name: 'OTL字幕组'
  },
  {
    id: 320,
    name: 'Sakura Cafe'
  },
  {
    id: 321,
    name: '轻之国度'
  },
  {
    id: 322,
    name: 'TPTimE字幕组'
  },
  {
    id: 324,
    name: '希望之丘'
  },
  {
    id: 325,
    name: '不靠谱字幕组'
  },
  {
    id: 326,
    name: 'Vongola字幕'
  },
  {
    id: 328,
    name: '星尘字幕组'
  },
  {
    id: 329,
    name: 'ゆかり王国宣传部'
  },
  {
    id: 330,
    name: 'v-bird&Eros'
  },
  {
    id: 331,
    name: '零翼字幕组'
  },
  {
    id: 332,
    name: 'CureSub'
  },
  {
    id: 333,
    name: '风影字幕组'
  },
  {
    id: 334,
    name: '夢域理想鄉'
  },
  {
    id: 335,
    name: '178在线动漫'
  },
  {
    id: 336,
    name: '幽靈字幕組'
  },
  {
    id: 337,
    name: '麒麟KIRIN工作室'
  },
  {
    id: 338,
    name: '無根之樹分享組'
  },
  {
    id: 339,
    name: '章魚动漫'
  },
  {
    id: 340,
    name: 'R8-Project'
  },
  {
    id: 341,
    name: '京黑字幕组'
  },
  {
    id: 343,
    name: '昆侖字幕組'
  },
  {
    id: 344,
    name: '飞橙学院'
  },
  {
    id: 345,
    name: '下午茶字幕组'
  },
  {
    id: 346,
    name: '情愫影音'
  },
  {
    id: 348,
    name: 'ACG'
  },
  {
    id: 349,
    name: 'THK字幕組'
  },
  {
    id: 350,
    name: 'HOBBY動漫字幕組'
  },
  {
    id: 351,
    name: 'PHDOGS!'
  },
  {
    id: 352,
    name: '猴団汉化组'
  },
  {
    id: 353,
    name: '联合动漫'
  },
  {
    id: 354,
    name: '特別放送'
  },
  {
    id: 355,
    name: '代理發布組'
  },
  {
    id: 356,
    name: '傲嬌字幕組'
  },
  {
    id: 357,
    name: '東攻霸字幕組'
  },
  {
    id: 358,
    name: 'F-Sky字幕組'
  },
  {
    id: 359,
    name: '极速字幕工作室'
  },
  {
    id: 360,
    name: '字幕千本桜'
  },
  {
    id: 361,
    name: 'ACG字幕组'
  },
  {
    id: 362,
    name: '萌月字幕组'
  },
  {
    id: 363,
    name: '桜舞字幕社'
  },
  {
    id: 364,
    name: 'K2字幕組'
  },
  {
    id: 365,
    name: '天蝎字幕组'
  },
  {
    id: 366,
    name: '异域-11番小队'
  },
  {
    id: 367,
    name: '夏ノ空汉化协会'
  },
  {
    id: 368,
    name: '白选馆汉化组'
  },
  {
    id: 369,
    name: '雪酷字幕组'
  },
  {
    id: 370,
    name: '旋风字幕组'
  },
  {
    id: 371,
    name: '萌幻字幕组'
  },
  {
    id: 372,
    name: '幻兽之骑士团'
  },
  {
    id: 373,
    name: 'ANK-Project'
  },
  {
    id: 374,
    name: '美战之星字幕组'
  },
  {
    id: 375,
    name: 'ANK-Raws'
  },
  {
    id: 376,
    name: 'ACB字幕组'
  },
  {
    id: 379,
    name: '动漫巴士'
  },
  {
    id: 380,
    name: '猪猪字幕组'
  },
  {
    id: 381,
    name: '動音律'
  },
  {
    id: 383,
    name: 'G-hm'
  },
  {
    id: 384,
    name: '漫狩汉化组'
  },
  {
    id: 385,
    name: '漫影字幕组'
  },
  {
    id: 386,
    name: 'AoiNeko字幕组'
  },
  {
    id: 387,
    name: 'CLA發佈組'
  },
  {
    id: 388,
    name: '翼之梦字幕组'
  },
  {
    id: 389,
    name: '麦阁字幕组'
  },
  {
    id: 390,
    name: '天使动漫论坛'
  },
  {
    id: 391,
    name: 'ZERO字幕组'
  },
  {
    id: 392,
    name: '烏賊發佈'
  },
  {
    id: 393,
    name: '紫月發佈組'
  },
  {
    id: 394,
    name: '夜莺工作室'
  },
  {
    id: 395,
    name: 'restart字幕组'
  },
  {
    id: 396,
    name: '搖籃字幕組'
  },
  {
    id: 397,
    name: '光见守ACG家族'
  },
  {
    id: 398,
    name: '宅结界汉化组'
  },
  {
    id: 399,
    name: '幻龙字幕组'
  },
  {
    id: 400,
    name: '微笑字幕組'
  },
  {
    id: 401,
    name: 'Astral Union'
  },
  {
    id: 402,
    name: '米花学园汉化组'
  },
  {
    id: 403,
    name: '聖域字幕組'
  },
  {
    id: 404,
    name: '碧陽字幕組'
  },
  {
    id: 405,
    name: 'ACE字幕組'
  },
  {
    id: 406,
    name: '同萌工作室'
  },
  {
    id: 407,
    name: 'DHR動研字幕組'
  },
  {
    id: 408,
    name: 'Miga字幕組'
  },
  {
    id: 409,
    name: '黑咪漫畫組'
  },
  {
    id: 410,
    name: '动漫城堡论坛'
  },
  {
    id: 411,
    name: '太古遺產'
  },
  {
    id: 412,
    name: 'ByConan字幕組'
  },
  {
    id: 414,
    name: '四季字幕组'
  },
  {
    id: 415,
    name: 'Sphere-HoLic'
  },
  {
    id: 417,
    name: '檸檬字幕组'
  },
  {
    id: 418,
    name: 'C.C字幕组'
  },
  {
    id: 419,
    name: '你妹發佈'
  },
  {
    id: 420,
    name: '游风字幕组'
  },
  {
    id: 421,
    name: '夏砂字幕组'
  },
  {
    id: 422,
    name: '黑白映画字幕社'
  },
  {
    id: 423,
    name: '漫貓字幕組'
  },
  {
    id: 424,
    name: 'TSDM字幕組'
  },
  {
    id: 425,
    name: 'RH字幕组'
  },
  {
    id: 426,
    name: 'CureFans小隊'
  },
  {
    id: 427,
    name: 'FirstLove字幕組'
  },
  {
    id: 428,
    name: 'PS900W'
  },
  {
    id: 429,
    name: '启萌字幕组'
  },
  {
    id: 430,
    name: '幻之字幕组'
  },
  {
    id: 431,
    name: '勇氣字幕組'
  },
  {
    id: 432,
    name: '自由字幕组'
  },
  {
    id: 433,
    name: '花園奧義社團'
  },
  {
    id: 434,
    name: '风之圣殿'
  },
  {
    id: 435,
    name: '2次元字幕组'
  },
  {
    id: 436,
    name: 'BBA字幕组'
  },
  {
    id: 437,
    name: '萌网'
  },
  {
    id: 438,
    name: '白恋字幕组'
  },
  {
    id: 439,
    name: '繁體動畫字幕聯盟'
  },
  {
    id: 440,
    name: '花見社'
  },
  {
    id: 441,
    name: '2DLand字幕组'
  },
  {
    id: 443,
    name: '幻想字幕组'
  },
  {
    id: 444,
    name: '光之园字幕组'
  },
  {
    id: 446,
    name: 'HSQ-rip組'
  },
  {
    id: 447,
    name: '夢幻戀櫻'
  },
  {
    id: 448,
    name: '漫盟之影字幕组'
  },
  {
    id: 449,
    name: '生徒会字幕组'
  },
  {
    id: 451,
    name: '听潺社'
  },
  {
    id: 452,
    name: '汐染字幕社'
  },
  {
    id: 453,
    name: '天空字幕组'
  },
  {
    id: 454,
    name: '风车字幕组'
  },
  {
    id: 455,
    name: '吖吖日剧字幕组'
  },
  {
    id: 457,
    name: '夜月字幕組'
  },
  {
    id: 458,
    name: 'WHITE MOON'
  },
  {
    id: 459,
    name: '紫音動漫&發佈組'
  },
  {
    id: 461,
    name: '萌貓同好會'
  },
  {
    id: 463,
    name: '櫻戀字幕組'
  },
  {
    id: 464,
    name: 'NTR字幕組'
  },
  {
    id: 466,
    name: '夏雪字幕組'
  },
  {
    id: 468,
    name: '喵萌茶会字幕组'
  },
  {
    id: 470,
    name: 'GAL-Sora论坛'
  },
  {
    id: 471,
    name: '青翼字幕组'
  },
  {
    id: 472,
    name: 'KIDFansClub'
  },
  {
    id: 473,
    name: 'ZaZa-Raws'
  },
  {
    id: 474,
    name: 'Astro工作室'
  },
  {
    id: 475,
    name: '汐空字幕组'
  },
  {
    id: 476,
    name: '謎之自壓組'
  },
  {
    id: 477,
    name: 'HGD'
  },
  {
    id: 478,
    name: '謎萌社'
  },
  {
    id: 479,
    name: 'Little Subbers!'
  },
  {
    id: 480,
    name: 'Ylbud樱律字幕组'
  },
  {
    id: 481,
    name: '红莲汉化组'
  },
  {
    id: 482,
    name: 'TC字幕组'
  },
  {
    id: 483,
    name: '节操字幕社'
  },
  {
    id: 484,
    name: '啟萌字幕組'
  },
  {
    id: 485,
    name: '天空树双语字幕组'
  },
  {
    id: 486,
    name: '每日学园'
  },
  {
    id: 487,
    name: '萌乐动漫'
  },
  {
    id: 488,
    name: '丸子家族'
  },
  {
    id: 489,
    name: '风旅字幕组'
  },
  {
    id: 490,
    name: '小行字幕组'
  },
  {
    id: 491,
    name: '黙示茶社'
  },
  {
    id: 492,
    name: 'TUcaptions'
  },
  {
    id: 494,
    name: '喵喵字幕組'
  },
  {
    id: 495,
    name: '76新番小组'
  },
  {
    id: 496,
    name: 'HTP字幕组'
  },
  {
    id: 497,
    name: '萌幻茶社'
  },
  {
    id: 498,
    name: 'KNA'
  },
  {
    id: 499,
    name: '天使羽音'
  },
  {
    id: 500,
    name: '白雪字幕社'
  },
  {
    id: 501,
    name: '天鹅之恋'
  },
  {
    id: 502,
    name: 'F宅字幕組'
  },
  {
    id: 503,
    name: 'TD字幕组'
  },
  {
    id: 504,
    name: 'LoveEcho!'
  },
  {
    id: 506,
    name: '银光字幕组'
  },
  {
    id: 507,
    name: '囧夏发布组'
  },
  {
    id: 508,
    name: 'DHK字幕組'
  },
  {
    id: 509,
    name: 'Non-Limit FanSubs'
  },
  {
    id: 512,
    name: 'BYSub'
  },
  {
    id: 513,
    name: '漫之学园'
  },
  {
    id: 515,
    name: 'U2娘@Share'
  },
  {
    id: 516,
    name: 'TFO字幕組'
  },
  {
    id: 517,
    name: '樱翼汉化组'
  },
  {
    id: 518,
    name: 'asdfe0'
  },
  {
    id: 519,
    name: '茉语字幕组'
  },
  {
    id: 520,
    name: '豌豆字幕组'
  },
  {
    id: 522,
    name: '梦物语字幕组'
  },
  {
    id: 525,
    name: '西农YUI汉化组'
  },
  {
    id: 526,
    name: '东京不够热'
  },
  {
    id: 527,
    name: '萌物百科字幕组'
  },
  {
    id: 529,
    name: '動漫萌系字幕組'
  },
  {
    id: 530,
    name: '萌物百科'
  },
  {
    id: 531,
    name: '清蓝动漫'
  },
  {
    id: 532,
    name: '傲娇零字幕组'
  },
  {
    id: 533,
    name: '花语发布'
  },
  {
    id: 534,
    name: 'THE一滅寂'
  },
  {
    id: 535,
    name: '楓漫漢化組'
  },
  {
    id: 536,
    name: 'Vmoe字幕組'
  },
  {
    id: 537,
    name: 'NEO·QSW'
  },
  {
    id: 538,
    name: '摸死團字幕組'
  },
  {
    id: 539,
    name: 'BRB'
  },
  {
    id: 540,
    name: '吐槽字幕组'
  },
  {
    id: 541,
    name: 'EggPainRaws'
  },
  {
    id: 542,
    name: '黒川実業字幕組'
  },
  {
    id: 543,
    name: 'Nyamazing字幕組'
  },
  {
    id: 544,
    name: '動漫流行館字幕組'
  },
  {
    id: 545,
    name: '天使羽翼字幕组'
  },
  {
    id: 547,
    name: '莳乃字幕屋'
  },
  {
    id: 550,
    name: '萝莉社活动室'
  },
  {
    id: 551,
    name: '宅宅合集'
  },
  {
    id: 552,
    name: '梦星字幕组'
  },
  {
    id: 553,
    name: '御宅同萌'
  },
  {
    id: 554,
    name: 'ErS贰石字幕组'
  },
  {
    id: 555,
    name: 'AOK字幕组'
  },
  {
    id: 556,
    name: '蔓越莓字幕组'
  },
  {
    id: 557,
    name: '聆风字幕组'
  },
  {
    id: 558,
    name: '星火字幕组'
  },
  {
    id: 559,
    name: '漫藤字幕组'
  },
  {
    id: 560,
    name: '绯蓝字幕组'
  },
  {
    id: 561,
    name: '钉铛字幕组'
  },
  {
    id: 562,
    name: '129.3字幕組'
  },
  {
    id: 563,
    name: '花園壓制組'
  },
  {
    id: 564,
    name: '风翼字幕组'
  },
  {
    id: 565,
    name: '茶会字幕组'
  },
  {
    id: 566,
    name: '聆风汉化组'
  },
  {
    id: 567,
    name: '雪梦字幕组'
  },
  {
    id: 568,
    name: '脸肿字幕组'
  },
  {
    id: 569,
    name: '盲点字幕组'
  },
  {
    id: 570,
    name: '時雨初空'
  },
  {
    id: 574,
    name: '梦蓝字幕组'
  },
  {
    id: 576,
    name: '银色子弹字幕组'
  },
  {
    id: 581,
    name: 'VCB-Studio'
  },
  {
    id: 582,
    name: '星冈汉化联合会'
  },
  {
    id: 583,
    name: 'あさいのお菓子屋'
  },
  {
    id: 584,
    name: '佳芸字幕组'
  },
  {
    id: 585,
    name: '雾雨字幕组'
  },
  {
    id: 587,
    name: 'PokerFans字幕组'
  },
  {
    id: 588,
    name: '梦奇字幕组'
  },
  {
    id: 589,
    name: '脑·洞字幕组'
  },
  {
    id: 592,
    name: '未央阁联盟'
  },
  {
    id: 593,
    name: '御宅爱萌家族'
  },
  {
    id: 596,
    name: '魂组'
  },
  {
    id: 597,
    name: 'DM1080P冷番组'
  },
  {
    id: 598,
    name: 'SNOW放映社(SnowSub)'
  },
  {
    id: 599,
    name: '暖萌的红烧鱼'
  },
  {
    id: 601,
    name: '繁星字幕组'
  },
  {
    id: 603,
    name: '风花字幕组'
  },
  {
    id: 604,
    name: 'c.c动漫'
  },
  {
    id: 605,
    name: '漫之岛动漫'
  },
  {
    id: 606,
    name: '天の翼字幕汉化社'
  },
  {
    id: 607,
    name: '萌族'
  },
  {
    id: 609,
    name: '断扎神教字幕组'
  },
  {
    id: 613,
    name: 'AI-Raws'
  },
  {
    id: 614,
    name: '神奇字幕组'
  },
  {
    id: 615,
    name: 'AVCHD'
  },
  {
    id: 616,
    name: '追放字幕组'
  },
  {
    id: 619,
    name: '桜都字幕组'
  },
  {
    id: 620,
    name: 'ay字幕组'
  },
  {
    id: 624,
    name: 'FIX字幕侠'
  },
  {
    id: 626,
    name: '驯兽师联盟'
  },
  {
    id: 627,
    name: '波洛咖啡厅'
  },
  {
    id: 628,
    name: 'CE家族社字幕组'
  },
  {
    id: 629,
    name: 'Yw7'
  },
  {
    id: 630,
    name: '枫叶字幕组'
  },
  {
    id: 631,
    name: '省电Raws'
  },
  {
    id: 632,
    name: '歐克勒亞'
  },
  {
    id: 636,
    name: 'ARIA吧汉化组'
  },
  {
    id: 637,
    name: '野猫字幕组'
  },
  {
    id: 638,
    name: 'LittleBakas!'
  },
  {
    id: 639,
    name: '仲夏动漫字幕组'
  },
  {
    id: 641,
    name: '冷番补完字幕组'
  },
  {
    id: 642,
    name: 'CYsub.蟾蜍字幕組'
  },
  {
    id: 644,
    name: 'DIGI-STUDIO'
  },
  {
    id: 645,
    name: '众神之王字幕组'
  },
  {
    id: 646,
    name: '夜楓字幕組'
  },
  {
    id: 647,
    name: '业界毒瘤'
  },
  {
    id: 648,
    name: '魔星字幕团'
  },
  {
    id: 649,
    name: '云光字幕组'
  },
  {
    id: 650,
    name: 'SweetSub'
  },
  {
    id: 651,
    name: '追新番字幕组'
  },
  {
    id: 652,
    name: 'SFEO-Raws'
  },
  {
    id: 653,
    name: 'The ARC-V Project'
  },
  {
    id: 654,
    name: '藍白條論壇·玖組'
  },
  {
    id: 655,
    name: '漫元字幕组'
  },
  {
    id: 656,
    name: '丢丢字幕组'
  },
  {
    id: 657,
    name: 'LoliHouse'
  },
  {
    id: 658,
    name: 'ACG调查小队'
  },
  {
    id: 659,
    name: '君の名は。FANS字幕組'
  },
  {
    id: 660,
    name: '2p3'
  },
  {
    id: 661,
    name: '鋼244'
  },
  {
    id: 663,
    name: '八重樱字幕组'
  },
  {
    id: 664,
    name: '虚数学区研究协会'
  },
  {
    id: 665,
    name: 'YWCN字幕组'
  },
  {
    id: 666,
    name: '中肯字幕組'
  },
  {
    id: 667,
    name: '海贼王微圈'
  },
  {
    id: 669,
    name: '喵萌奶茶屋'
  },
  {
    id: 670,
    name: 'MechaAnime_Fan_Sub'
  },
  {
    id: 672,
    name: '新番字幕组'
  },
  {
    id: 673,
    name: 'VRAINSTORM'
  },
  {
    id: 674,
    name: 'KaS製作組'
  },
  {
    id: 675,
    name: 'AikatsuFans'
  },
  {
    id: 676,
    name: '神帆字幕组'
  },
  {
    id: 677,
    name: '咖啡發佈'
  },
  {
    id: 678,
    name: '铜锣字幕组'
  },
  {
    id: 679,
    name: '咕咕茶字幕组'
  },
  {
    id: 680,
    name: 'Little字幕组'
  },
  {
    id: 682,
    name: '唯梦字幕组'
  },
  {
    id: 683,
    name: '哆啦字幕组'
  },
  {
    id: 684,
    name: 'MT字幕组'
  },
  {
    id: 686,
    name: 'HoneyGod'
  },
  {
    id: 687,
    name: 'BlueRabbit'
  },
  {
    id: 688,
    name: '物语系列圈'
  },
  {
    id: 689,
    name: '放学后的死神'
  },
  {
    id: 690,
    name: '虐心发布组'
  },
  {
    id: 691,
    name: '橙白字幕社'
  },
  {
    id: 693,
    name: '总有一天汉化组'
  },
  {
    id: 694,
    name: '咪路fans制作组'
  },
  {
    id: 695,
    name: 'c-a Raws'
  },
  {
    id: 697,
    name: 'NAZOrip'
  },
  {
    id: 700,
    name: 'Producer字幕組'
  },
  {
    id: 701,
    name: '狐狸小宮'
  },
  {
    id: 702,
    name: 'TenYun'
  },
  {
    id: 703,
    name: '届恋字幕组'
  },
  {
    id: 705,
    name: '小愿8压制组'
  },
  {
    id: 706,
    name: 'K&W-RAWS'
  },
  {
    id: 708,
    name: '青森小镇'
  },
  {
    id: 709,
    name: '飞龙骑脸字幕组(G.I.A.N.T)'
  },
  {
    id: 710,
    name: '咪梦动漫组'
  },
  {
    id: 711,
    name: '闺房调查团'
  },
  {
    id: 712,
    name: '闲人字幕联萌'
  },
  {
    id: 713,
    name: '萌FUN字幕组'
  },
  {
    id: 716,
    name: 'Astral Union字幕组'
  },
  {
    id: 717,
    name: 'AZT字幕组'
  },
  {
    id: 719,
    name: '80v08'
  },
  {
    id: 720,
    name: 'YMDR发布组'
  },
  {
    id: 721,
    name: '魯邦聯會'
  },
  {
    id: 723,
    name: '乐园字幕组'
  },
  {
    id: 724,
    name: 'SKY字幕组'
  },
  {
    id: 725,
    name: 'NoBody'
  },
  {
    id: 726,
    name: 'Mabors-Raws'
  },
  {
    id: 727,
    name: '2B4B'
  },
  {
    id: 728,
    name: '指原x櫻花字幕組'
  },
  {
    id: 729,
    name: 'YG字幕组'
  },
  {
    id: 730,
    name: '资源萌茶会'
  },
  {
    id: 731,
    name: '星空字幕组'
  },
  {
    id: 732,
    name: '肥猫压制'
  },
  {
    id: 734,
    name: 'TD-RAWS'
  },
  {
    id: 735,
    name: 'AcgN深雪'
  },
  {
    id: 736,
    name: '珞樱字幕社'
  },
  {
    id: 737,
    name: 'Rakka-Aria'
  },
  {
    id: 739,
    name: 'Clarita 压制组'
  },
  {
    id: 741,
    name: '銀月字幕組'
  },
  {
    id: 742,
    name: 'QS-Raws'
  },
  {
    id: 743,
    name: '神帆动漫'
  },
  {
    id: 749,
    name: '幻月字幕组'
  },
  {
    id: 752,
    name: '404GROUP'
  },
  {
    id: 753,
    name: '柠檬水字幕组'
  },
  {
    id: 754,
    name: 'BYYM发布组'
  },
  {
    id: 755,
    name: 'GMTeam'
  },
  {
    id: 757,
    name: 'RvE发布组'
  },
  {
    id: 759,
    name: '红鸟窝字幕组'
  },
  {
    id: 763,
    name: '光之家族字幕组'
  },
  {
    id: 764,
    name: 'MCE汉化组'
  },
  {
    id: 765,
    name: '爱咕字幕组'
  },
  {
    id: 767,
    name: '天月動漫&發佈組'
  },
  {
    id: 768,
    name: '千歲字幕組'
  },
  {
    id: 769,
    name: '动漫萌'
  },
  {
    id: 770,
    name: '檸檬好酸字幕組'
  },
  {
    id: 772,
    name: 'IET字幕組'
  },
  {
    id: 779,
    name: '银刃字幕组'
  },
  {
    id: 781,
    name: 'SW字幕组'
  },
  {
    id: 784,
    name: 'Voice Memories'
  },
  {
    id: 785,
    name: '野比家字幕组'
  },
  {
    id: 786,
    name: '棒聯貼吧字幕組'
  },
  {
    id: 787,
    name: 'STL字幕組'
  },
  {
    id: 788,
    name: 'ebbSub'
  },
  {
    id: 790,
    name: 'WBX-SUB'
  },
  {
    id: 792,
    name: 'ANS-Union'
  },
  {
    id: 794,
    name: 'Niconeiko Works'
  },
  {
    id: 795,
    name: '游離貓字幕組'
  },
  {
    id: 796,
    name: '臭臭动漫整合'
  },
  {
    id: 797,
    name: '森之屋动画组'
  },
  {
    id: 799,
    name: '白虎野'
  },
  {
    id: 800,
    name: 'TK-Raws'
  },
  {
    id: 801,
    name: 'NC-Raws'
  },
  {
    id: 802,
    name: '酷漫404'
  },
  {
    id: 803,
    name: 'Lilith-Raws'
  },
  {
    id: 804,
    name: '霜庭云花Sub'
  },
  {
    id: 805,
    name: 'DBD制作组'
  },
  {
    id: 806,
    name: '离谱Sub'
  },
  {
    id: 807,
    name: 'Liella!の烧烤摊'
  },
  {
    id: 808,
    name: '夜莺家族'
  },
  {
    id: 812,
    name: '虹咲学园烤肉同好会'
  },
  {
    id: 813,
    name: 'MingYSub'
  },
  {
    id: 814,
    name: 'Amor字幕组'
  },
  {
    id: 816,
    name: 'ANi'
  },
  {
    id: 817,
    name: 'EMe'
  },
  {
    id: 818,
    name: 'Alchemist'
  },
  {
    id: 819,
    name: '黑岩射手吧字幕组'
  },
  {
    id: 821,
    name: '百冬練習組'
  },
  {
    id: 822,
    name: '極彩字幕组'
  },
  {
    id: 824,
    name: '织梦字幕组'
  },
  {
    id: 825,
    name: '猎户发布组'
  },
  {
    id: 826,
    name: '秋人字幕'
  },
  {
    id: 827,
    name: '亿次研同好会'
  },
  {
    id: 828,
    name: '真龙会星际文件组'
  },
  {
    id: 829,
    name: '爪爪字幕组'
  },
  {
    id: 830,
    name: 'PorterRAWS'
  },
  {
    id: 831,
    name: 'lu-ul'
  },
  {
    id: 832,
    name: 'Sakura'
  },
  {
    id: 833,
    name: '北宇治字幕组'
  },
  {
    id: 834,
    name: '氢气烤肉架'
  },
  {
    id: 837,
    name: '六道我大鸽汉化组'
  },
  {
    id: 838,
    name: '云歌字幕组'
  },
  {
    id: 840,
    name: '成子坂地下室'
  },
  {
    id: 841,
    name: '失眠搬运组'
  },
  {
    id: 842,
    name: 'SRVFI-Raws'
  },
  {
    id: 843,
    name: 'Pharos of MyGO'
  }
];

export function findFansub(text: number): (typeof AllFansubs)[0];
export function findFansub(text: string, options?: { fuzzy: boolean }): (typeof AllFansubs)[0];
export function findFansub(text: number | string, options: { fuzzy: boolean } = { fuzzy: false }) {
  if (typeof text === 'number') {
    return AllFansubs.find((f) => f.id === text);
  } else if (typeof text === 'string') {
    if (options.fuzzy) {
      const word = tradToSimple(text);
      const found = AllFansubs.find((f) => tradToSimple(f.name).includes(word));
      if (found) {
        return found;
      } else if (word.includes('樱')) {
        const word2 = word.replace('樱', '桜');
        return AllFansubs.find((f) => tradToSimple(f.name).includes(word2));
      }
    } else {
      return AllFansubs.find((f) => f.name === text);
    }
  }
  return undefined;
}
