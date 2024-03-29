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
  { provider: 'dmhy', providerId: '18', name: '動漫花園字幕組' },
  { provider: 'dmhy', providerId: '22', name: '音樂@花園' },
  { provider: 'dmhy', providerId: '24', name: 'ReSeeD@花園' },
  { provider: 'dmhy', providerId: '27', name: '星组@花園' },
  { provider: 'dmhy', providerId: '28', name: '楓組@花園' },
  { provider: 'dmhy', providerId: '29', name: 'T3@花園' },
  { provider: 'dmhy', providerId: '30', name: '光之字幕組' },
  { provider: 'dmhy', providerId: '31', name: '卡通空間' },
  { provider: 'dmhy', providerId: '32', name: 'SOSG字幕团' },
  { provider: 'dmhy', providerId: '34', name: '楓雪連載製作' },
  { provider: 'dmhy', providerId: '36', name: '流鳴聯合本居' },
  { provider: 'dmhy', providerId: '37', name: '雪飄工作室(FLsnow)' },
  { provider: 'dmhy', providerId: '40', name: '伊妹兒字幕組' },
  { provider: 'dmhy', providerId: '41', name: 'HKG字幕組' },
  { provider: 'dmhy', providerId: '44', name: '08MV小隊' },
  { provider: 'dmhy', providerId: '45', name: '靈風FOSKY工作室' },
  { provider: 'dmhy', providerId: '47', name: '爱恋字幕社' },
  { provider: 'dmhy', providerId: '49', name: '华盟字幕社' },
  { provider: 'dmhy', providerId: '51', name: "I've工作室" },
  { provider: 'dmhy', providerId: '52', name: '中國動物園' },
  { provider: 'dmhy', providerId: '53', name: 'KFC特創組' },
  { provider: 'dmhy', providerId: '54', name: 'MC日劇字幕組(MCS)' },
  { provider: 'dmhy', providerId: '57', name: '月光恋曲字幕组' },
  { provider: 'dmhy', providerId: '58', name: '澄空学园' },
  { provider: 'dmhy', providerId: '59', name: 'X2字幕組' },
  { provider: 'dmhy', providerId: '60', name: 'W-zone字幕组' },
  { provider: 'dmhy', providerId: '63', name: '琵琶行字幕组' },
  { provider: 'dmhy', providerId: '66', name: 'GZone Anime' },
  { provider: 'dmhy', providerId: '70', name: 'JPOPPV联盟' },
  { provider: 'dmhy', providerId: '71', name: 'OUR字幕组' },
  { provider: 'dmhy', providerId: '72', name: '狼集字幕组' },
  { provider: 'dmhy', providerId: '75', name: '柯南事务所' },
  { provider: 'dmhy', providerId: '76', name: '#CHAT RUMBLE#' },
  { provider: 'dmhy', providerId: '77', name: 'H&C推广站' },
  { provider: 'dmhy', providerId: '78', name: '安達充主題論壇' },
  { provider: 'dmhy', providerId: '79', name: 'NGMFans' },
  { provider: 'dmhy', providerId: '81', name: '永恒动漫' },
  { provider: 'dmhy', providerId: '82', name: '3DH字幕组' },
  { provider: 'dmhy', providerId: '83', name: '雪月字幕組' },
  { provider: 'dmhy', providerId: '86', name: '漫娱论坛' },
  { provider: 'dmhy', providerId: '88', name: '动音漫影' },
  { provider: 'dmhy', providerId: '89', name: '漫翔字幕組' },
  { provider: 'dmhy', providerId: '90', name: '恶魔岛字幕组' },
  { provider: 'dmhy', providerId: '92', name: 'VGMU' },
  { provider: 'dmhy', providerId: '94', name: 'C2Club' },
  { provider: 'dmhy', providerId: '95', name: 'JPSEEK' },
  { provider: 'dmhy', providerId: '96', name: '清風朔鈴' },
  { provider: 'dmhy', providerId: '99', name: 'DMS字幕组' },
  { provider: 'dmhy', providerId: '103', name: '竹零字幕' },
  { provider: 'dmhy', providerId: '104', name: '动漫先锋' },
  { provider: 'dmhy', providerId: '105', name: '天の字幕組' },
  { provider: 'dmhy', providerId: '106', name: '唯易字幕组' },
  { provider: 'dmhy', providerId: '110', name: '天香字幕社' },
  { provider: 'dmhy', providerId: '113', name: 'Lost Summer工作室' },
  { provider: 'dmhy', providerId: '117', name: '動漫花園' },
  { provider: 'dmhy', providerId: '119', name: '月舞字幕组' },
  { provider: 'dmhy', providerId: '122', name: '樱の萌字幕组' },
  { provider: 'dmhy', providerId: '124', name: '流云字幕组' },
  { provider: 'dmhy', providerId: '128', name: '牧云字幕组' },
  { provider: 'dmhy', providerId: '129', name: '动漫之家' },
  { provider: 'dmhy', providerId: '131', name: 'Tsubasa字幕组' },
  { provider: 'dmhy', providerId: '133', name: '天幻字幕组' },
  { provider: 'dmhy', providerId: '134', name: '漫游字幕组' },
  { provider: 'dmhy', providerId: '137', name: 'SOSROOM字幕组' },
  { provider: 'dmhy', providerId: '138', name: '动漫怨念屋' },
  { provider: 'dmhy', providerId: '140', name: '中国废柴协会' },
  { provider: 'dmhy', providerId: '141', name: 'WOLF字幕组' },
  { provider: 'dmhy', providerId: '142', name: '空境字幕组' },
  { provider: 'dmhy', providerId: '145', name: '狗狗制作组' },
  { provider: 'dmhy', providerId: '146', name: '幻境字幕社' },
  { provider: 'dmhy', providerId: '147', name: '奥盟字幕组' },
  { provider: 'dmhy', providerId: '148', name: 'S.T.R.SubFans' },
  { provider: 'dmhy', providerId: '151', name: '悠哈C9字幕社' },
  { provider: 'dmhy', providerId: '152', name: '雪铃动漫组' },
  { provider: 'dmhy', providerId: '153', name: '空岛字幕组' },
  { provider: 'dmhy', providerId: '154', name: 'KPDM字幕组' },
  { provider: 'dmhy', providerId: '157', name: '曙光社字幕组' },
  { provider: 'dmhy', providerId: '161', name: '悠久の風' },
  { provider: 'dmhy', providerId: '162', name: '水晶海汉化组' },
  { provider: 'dmhy', providerId: '163', name: '四叶星字幕组' },
  { provider: 'dmhy', providerId: '165', name: '御宅梦域' },
  { provider: 'dmhy', providerId: '167', name: '回风汉化组' },
  { provider: 'dmhy', providerId: '168', name: '木木工作室' },
  { provider: 'dmhy', providerId: '178', name: '散漫字幕组' },
  { provider: 'dmhy', providerId: '179', name: '夕唯工作室' },
  { provider: 'dmhy', providerId: '185', name: '极影字幕社' },
  { provider: 'dmhy', providerId: '191', name: '炎鸟字幕组' },
  { provider: 'dmhy', providerId: '193', name: 'TAMASHII字幕組' },
  { provider: 'dmhy', providerId: '195', name: '幻樱砂之团(SCST)' },
  { provider: 'dmhy', providerId: '196', name: '空翼字幕组' },
  { provider: 'dmhy', providerId: '197', name: '◆漫游FREEWIND工作室' },
  { provider: 'dmhy', providerId: '198', name: '梦幻旋律♪发布组' },
  { provider: 'dmhy', providerId: '199', name: '学院字幕组' },
  { provider: 'dmhy', providerId: '200', name: '狮王汉化组' },
  { provider: 'dmhy', providerId: '202', name: '量子動漫组' },
  { provider: 'dmhy', providerId: '206', name: '酢浆草协会' },
  { provider: 'dmhy', providerId: '207', name: 'BDC字幕组' },
  { provider: 'dmhy', providerId: '209', name: '忘忧字幕组' },
  { provider: 'dmhy', providerId: '210', name: '动萌字幕组' },
  { provider: 'dmhy', providerId: '211', name: '蔷薇园动漫' },
  { provider: 'dmhy', providerId: '214', name: '夜露思苦漢化組' },
  { provider: 'dmhy', providerId: '215', name: 'ACT-SUB' },
  { provider: 'dmhy', providerId: '216', name: '抽风字幕组' },
  { provider: 'dmhy', providerId: '217', name: 'AQUA工作室' },
  { provider: 'dmhy', providerId: '218', name: 'RP工作室' },
  { provider: 'dmhy', providerId: '221', name: '无损疯人组' },
  { provider: 'dmhy', providerId: '222', name: 'A.I.R.nesSub' },
  { provider: 'dmhy', providerId: '223', name: 'DA同音爱漫' },
  { provider: 'dmhy', providerId: '224', name: '绯空字幕社' },
  { provider: 'dmhy', providerId: '225', name: '鈴風字幕組' },
  { provider: 'dmhy', providerId: '226', name: '黑博物館' },
  { provider: 'dmhy', providerId: '227', name: '卡萌动漫' },
  { provider: 'dmhy', providerId: '228', name: 'KRL字幕组' },
  { provider: 'dmhy', providerId: '230', name: '翼の堂字幕组' },
  { provider: 'dmhy', providerId: '231', name: '冰封字幕组' },
  { provider: 'dmhy', providerId: '234', name: '动漫FANS字幕组' },
  { provider: 'dmhy', providerId: '237', name: '樱花飞舞字幕组' },
  { provider: 'dmhy', providerId: '238', name: '音の谜森' },
  { provider: 'dmhy', providerId: '240', name: 'VAXVA' },
  { provider: 'dmhy', providerId: '241', name: '幻樱字幕组' },
  { provider: 'dmhy', providerId: '244', name: '指尖奶茶应援会' },
  { provider: 'dmhy', providerId: '245', name: '星期五字幕组' },
  { provider: 'dmhy', providerId: '248', name: 'GCF字幕組' },
  { provider: 'dmhy', providerId: '249', name: 'YYeTs日翻组' },
  { provider: 'dmhy', providerId: '250', name: '天籁字幕社' },
  { provider: 'dmhy', providerId: '251', name: '腹黑联盟' },
  { provider: 'dmhy', providerId: '252', name: '萌楼字幕组' },
  { provider: 'dmhy', providerId: '253', name: '步姐動漫' },
  { provider: 'dmhy', providerId: '254', name: '神创资源组' },
  { provider: 'dmhy', providerId: '256', name: '露西弗工作室' },
  { provider: 'dmhy', providerId: '257', name: '6d字幕社' },
  { provider: 'dmhy', providerId: '260', name: '魔影字幕组' },
  { provider: 'dmhy', providerId: '261', name: '未来风ACG' },
  { provider: 'dmhy', providerId: '263', name: '光荣字幕组' },
  { provider: 'dmhy', providerId: '264', name: '萌之音交流論壇' },
  { provider: 'dmhy', providerId: '265', name: '绝望御宅发布组' },
  { provider: 'dmhy', providerId: '267', name: '伊恋字幕社' },
  { provider: 'dmhy', providerId: '268', name: '2KF資源發佈組' },
  { provider: 'dmhy', providerId: '269', name: '复活城&猫咪' },
  { provider: 'dmhy', providerId: '270', name: '交响梦工坊' },
  { provider: 'dmhy', providerId: '271', name: '异域动漫' },
  { provider: 'dmhy', providerId: '273', name: '漫友之家压制组' },
  { provider: 'dmhy', providerId: '274', name: '三元色字幕组' },
  { provider: 'dmhy', providerId: '275', name: '漫游连载组PSS' },
  { provider: 'dmhy', providerId: '276', name: '萌之萝莉' },
  { provider: 'dmhy', providerId: '277', name: '萌音字幕组' },
  { provider: 'dmhy', providerId: '279', name: '霜月字幕組' },
  { provider: 'dmhy', providerId: '281', name: '伪世界汉化组' },
  { provider: 'dmhy', providerId: '282', name: 'HKACG字幕組' },
  { provider: 'dmhy', providerId: '283', name: '千夏字幕组' },
  { provider: 'dmhy', providerId: '284', name: '御宅领域' },
  { provider: 'dmhy', providerId: '285', name: '叶隐字幕组' },
  { provider: 'dmhy', providerId: '286', name: '樱雨学园' },
  { provider: 'dmhy', providerId: '288', name: '诸神kamigami字幕组' },
  { provider: 'dmhy', providerId: '289', name: '愛班漫畫社' },
  { provider: 'dmhy', providerId: '290', name: '人人影视发布组' },
  { provider: 'dmhy', providerId: '293', name: '天使字幕組' },
  { provider: 'dmhy', providerId: '294', name: 'BTC-Distro' },
  { provider: 'dmhy', providerId: '295', name: '星空网' },
  { provider: 'dmhy', providerId: '297', name: '爱恋研修社' },
  { provider: 'dmhy', providerId: '298', name: 'YYK字幕组' },
  { provider: 'dmhy', providerId: '299', name: '星光字幕组' },
  { provider: 'dmhy', providerId: '300', name: '咖啡字幕組' },
  { provider: 'dmhy', providerId: '301', name: '忍术学园' },
  { provider: 'dmhy', providerId: '302', name: '依缘字幕组' },
  { provider: 'dmhy', providerId: '303', name: '动漫国字幕组' },
  { provider: 'dmhy', providerId: '305', name: '夜明琉璃字幕社' },
  { provider: 'dmhy', providerId: '306', name: '中国龙珠论坛' },
  { provider: 'dmhy', providerId: '307', name: 'masora字幕組' },
  { provider: 'dmhy', providerId: '308', name: '漫友之家字幕组' },
  { provider: 'dmhy', providerId: '309', name: '草莓工作組' },
  { provider: 'dmhy', providerId: '310', name: '超盟字幕组' },
  { provider: 'dmhy', providerId: '311', name: '暮秋夏夜の部屋' },
  { provider: 'dmhy', providerId: '312', name: '动漫花园动音组' },
  { provider: 'dmhy', providerId: '313', name: '四魂制作组' },
  { provider: 'dmhy', providerId: '314', name: 'S群字幕組' },
  { provider: 'dmhy', providerId: '315', name: '动漫御宅' },
  { provider: 'dmhy', providerId: '316', name: '3DM动漫组' },
  { provider: 'dmhy', providerId: '317', name: '謎之聲字幕組' },
  { provider: 'dmhy', providerId: '319', name: 'OTL字幕组' },
  { provider: 'dmhy', providerId: '320', name: 'Sakura Cafe' },
  { provider: 'dmhy', providerId: '321', name: '轻之国度' },
  { provider: 'dmhy', providerId: '322', name: 'TPTimE字幕组' },
  { provider: 'dmhy', providerId: '324', name: '希望之丘' },
  { provider: 'dmhy', providerId: '325', name: '不靠谱字幕组' },
  { provider: 'dmhy', providerId: '326', name: 'Vongola字幕' },
  { provider: 'dmhy', providerId: '328', name: '星尘字幕组' },
  { provider: 'dmhy', providerId: '329', name: 'ゆかり王国宣传部' },
  { provider: 'dmhy', providerId: '330', name: 'v-bird&Eros' },
  { provider: 'dmhy', providerId: '331', name: '零翼字幕组' },
  { provider: 'dmhy', providerId: '332', name: 'CureSub' },
  { provider: 'dmhy', providerId: '333', name: '风影字幕组' },
  { provider: 'dmhy', providerId: '334', name: '夢域理想鄉' },
  { provider: 'dmhy', providerId: '335', name: '178在线动漫' },
  { provider: 'dmhy', providerId: '336', name: '幽靈字幕組' },
  { provider: 'dmhy', providerId: '337', name: '麒麟KIRIN工作室' },
  { provider: 'dmhy', providerId: '338', name: '無根之樹分享組' },
  { provider: 'dmhy', providerId: '339', name: '章魚动漫' },
  { provider: 'dmhy', providerId: '340', name: 'R8-Project' },
  { provider: 'dmhy', providerId: '341', name: '京黑字幕组' },
  { provider: 'dmhy', providerId: '343', name: '昆侖字幕組' },
  { provider: 'dmhy', providerId: '344', name: '飞橙学院' },
  { provider: 'dmhy', providerId: '345', name: '下午茶字幕组' },
  { provider: 'dmhy', providerId: '346', name: '情愫影音' },
  { provider: 'dmhy', providerId: '348', name: 'ACG' },
  { provider: 'dmhy', providerId: '349', name: 'THK字幕組' },
  { provider: 'dmhy', providerId: '350', name: 'HOBBY動漫字幕組' },
  { provider: 'dmhy', providerId: '351', name: 'PHDOGS!' },
  { provider: 'dmhy', providerId: '352', name: '猴団汉化组' },
  { provider: 'dmhy', providerId: '353', name: '联合动漫' },
  { provider: 'dmhy', providerId: '354', name: '特別放送' },
  { provider: 'dmhy', providerId: '355', name: '代理發布組' },
  { provider: 'dmhy', providerId: '356', name: '傲嬌字幕組' },
  { provider: 'dmhy', providerId: '357', name: '東攻霸字幕組' },
  { provider: 'dmhy', providerId: '358', name: 'F-Sky字幕組' },
  { provider: 'dmhy', providerId: '359', name: '极速字幕工作室' },
  { provider: 'dmhy', providerId: '360', name: '字幕千本桜' },
  { provider: 'dmhy', providerId: '361', name: 'ACG字幕组' },
  { provider: 'dmhy', providerId: '362', name: '萌月字幕组' },
  { provider: 'dmhy', providerId: '363', name: '桜舞字幕社' },
  { provider: 'dmhy', providerId: '364', name: 'K2字幕組' },
  { provider: 'dmhy', providerId: '365', name: '天蝎字幕组' },
  { provider: 'dmhy', providerId: '366', name: '异域-11番小队' },
  { provider: 'dmhy', providerId: '367', name: '夏ノ空汉化协会' },
  { provider: 'dmhy', providerId: '368', name: '白选馆汉化组' },
  { provider: 'dmhy', providerId: '369', name: '雪酷字幕组' },
  { provider: 'dmhy', providerId: '370', name: '旋风字幕组' },
  { provider: 'dmhy', providerId: '371', name: '萌幻字幕组' },
  { provider: 'dmhy', providerId: '372', name: '幻兽之骑士团' },
  { provider: 'dmhy', providerId: '373', name: 'ANK-Project' },
  { provider: 'dmhy', providerId: '374', name: '美战之星字幕组' },
  { provider: 'dmhy', providerId: '375', name: 'ANK-Raws' },
  { provider: 'dmhy', providerId: '376', name: 'ACB字幕组' },
  { provider: 'dmhy', providerId: '379', name: '动漫巴士' },
  { provider: 'dmhy', providerId: '380', name: '猪猪字幕组' },
  { provider: 'dmhy', providerId: '381', name: '動音律' },
  { provider: 'dmhy', providerId: '383', name: 'G-hm' },
  { provider: 'dmhy', providerId: '384', name: '漫狩汉化组' },
  { provider: 'dmhy', providerId: '385', name: '漫影字幕组' },
  { provider: 'dmhy', providerId: '386', name: 'AoiNeko字幕组' },
  { provider: 'dmhy', providerId: '387', name: 'CLA發佈組' },
  { provider: 'dmhy', providerId: '388', name: '翼之梦字幕组' },
  { provider: 'dmhy', providerId: '389', name: '麦阁字幕组' },
  { provider: 'dmhy', providerId: '390', name: '天使动漫论坛' },
  { provider: 'dmhy', providerId: '391', name: 'ZERO字幕组' },
  { provider: 'dmhy', providerId: '392', name: '烏賊發佈' },
  { provider: 'dmhy', providerId: '393', name: '紫月發佈組' },
  { provider: 'dmhy', providerId: '394', name: '夜莺工作室' },
  { provider: 'dmhy', providerId: '395', name: 'restart字幕组' },
  { provider: 'dmhy', providerId: '396', name: '搖籃字幕組' },
  { provider: 'dmhy', providerId: '397', name: '光见守ACG家族' },
  { provider: 'dmhy', providerId: '398', name: '宅结界汉化组' },
  { provider: 'dmhy', providerId: '399', name: '幻龙字幕组' },
  { provider: 'dmhy', providerId: '400', name: '微笑字幕組' },
  { provider: 'dmhy', providerId: '401', name: 'Astral Union' },
  { provider: 'dmhy', providerId: '402', name: '米花学园汉化组' },
  { provider: 'dmhy', providerId: '403', name: '聖域字幕組' },
  { provider: 'dmhy', providerId: '404', name: '碧陽字幕組' },
  { provider: 'dmhy', providerId: '405', name: 'ACE字幕組' },
  { provider: 'dmhy', providerId: '406', name: '同萌工作室' },
  { provider: 'dmhy', providerId: '407', name: 'DHR動研字幕組' },
  { provider: 'dmhy', providerId: '408', name: 'Miga字幕組' },
  { provider: 'dmhy', providerId: '409', name: '黑咪漫畫組' },
  { provider: 'dmhy', providerId: '410', name: '动漫城堡论坛' },
  { provider: 'dmhy', providerId: '411', name: '太古遺產' },
  { provider: 'dmhy', providerId: '412', name: 'ByConan字幕組' },
  { provider: 'dmhy', providerId: '414', name: '四季字幕组' },
  { provider: 'dmhy', providerId: '415', name: 'Sphere-HoLic' },
  { provider: 'dmhy', providerId: '417', name: '檸檬字幕组' },
  { provider: 'dmhy', providerId: '418', name: 'C.C字幕组' },
  { provider: 'dmhy', providerId: '419', name: '你妹發佈' },
  { provider: 'dmhy', providerId: '420', name: '游风字幕组' },
  { provider: 'dmhy', providerId: '421', name: '夏砂字幕组' },
  { provider: 'dmhy', providerId: '422', name: '黑白映画字幕社' },
  { provider: 'dmhy', providerId: '423', name: '漫貓字幕組' },
  { provider: 'dmhy', providerId: '424', name: 'TSDM字幕組' },
  { provider: 'dmhy', providerId: '425', name: 'RH字幕组' },
  { provider: 'dmhy', providerId: '426', name: 'CureFans小隊' },
  { provider: 'dmhy', providerId: '427', name: 'FirstLove字幕組' },
  { provider: 'dmhy', providerId: '428', name: 'PS900W' },
  { provider: 'dmhy', providerId: '429', name: '启萌字幕组' },
  { provider: 'dmhy', providerId: '430', name: '幻之字幕组' },
  { provider: 'dmhy', providerId: '431', name: '勇氣字幕組' },
  { provider: 'dmhy', providerId: '432', name: '自由字幕组' },
  { provider: 'dmhy', providerId: '433', name: '花園奧義社團' },
  { provider: 'dmhy', providerId: '434', name: '风之圣殿' },
  { provider: 'dmhy', providerId: '435', name: '2次元字幕组' },
  { provider: 'dmhy', providerId: '436', name: 'BBA字幕组' },
  { provider: 'dmhy', providerId: '437', name: '萌网' },
  { provider: 'dmhy', providerId: '438', name: '白恋字幕组' },
  { provider: 'dmhy', providerId: '439', name: '繁體動畫字幕聯盟' },
  { provider: 'dmhy', providerId: '440', name: '花見社' },
  { provider: 'dmhy', providerId: '441', name: '2DLand字幕组' },
  { provider: 'dmhy', providerId: '443', name: '幻想字幕组' },
  { provider: 'dmhy', providerId: '444', name: '光之园字幕组' },
  { provider: 'dmhy', providerId: '446', name: 'HSQ-rip組' },
  { provider: 'dmhy', providerId: '447', name: '夢幻戀櫻' },
  { provider: 'dmhy', providerId: '448', name: '漫盟之影字幕组' },
  { provider: 'dmhy', providerId: '449', name: '生徒会字幕组' },
  { provider: 'dmhy', providerId: '451', name: '听潺社' },
  { provider: 'dmhy', providerId: '452', name: '汐染字幕社' },
  { provider: 'dmhy', providerId: '453', name: '天空字幕组' },
  { provider: 'dmhy', providerId: '454', name: '风车字幕组' },
  { provider: 'dmhy', providerId: '455', name: '吖吖日剧字幕组' },
  { provider: 'dmhy', providerId: '457', name: '夜月字幕組' },
  { provider: 'dmhy', providerId: '458', name: 'WHITE MOON' },
  { provider: 'dmhy', providerId: '459', name: '紫音動漫&發佈組' },
  { provider: 'dmhy', providerId: '461', name: '萌貓同好會' },
  { provider: 'dmhy', providerId: '463', name: '櫻戀字幕組' },
  { provider: 'dmhy', providerId: '464', name: 'NTR字幕組' },
  { provider: 'dmhy', providerId: '466', name: '夏雪字幕組' },
  { provider: 'dmhy', providerId: '468', name: '喵萌茶会字幕组' },
  { provider: 'dmhy', providerId: '470', name: 'GAL-Sora论坛' },
  { provider: 'dmhy', providerId: '471', name: '青翼字幕组' },
  { provider: 'dmhy', providerId: '472', name: 'KIDFansClub' },
  { provider: 'dmhy', providerId: '473', name: 'ZaZa-Raws' },
  { provider: 'dmhy', providerId: '474', name: 'Astro工作室' },
  { provider: 'dmhy', providerId: '475', name: '汐空字幕组' },
  { provider: 'dmhy', providerId: '476', name: '謎之自壓組' },
  { provider: 'dmhy', providerId: '477', name: 'HGD' },
  { provider: 'dmhy', providerId: '478', name: '謎萌社' },
  { provider: 'dmhy', providerId: '479', name: 'Little Subbers!' },
  { provider: 'dmhy', providerId: '480', name: 'Ylbud樱律字幕组' },
  { provider: 'dmhy', providerId: '481', name: '红莲汉化组' },
  { provider: 'dmhy', providerId: '482', name: 'TC字幕组' },
  { provider: 'dmhy', providerId: '483', name: '节操字幕社' },
  { provider: 'dmhy', providerId: '484', name: '啟萌字幕組' },
  { provider: 'dmhy', providerId: '485', name: '天空树双语字幕组' },
  { provider: 'dmhy', providerId: '486', name: '每日学园' },
  { provider: 'dmhy', providerId: '487', name: '萌乐动漫' },
  { provider: 'dmhy', providerId: '488', name: '丸子家族' },
  { provider: 'dmhy', providerId: '489', name: '风旅字幕组' },
  { provider: 'dmhy', providerId: '490', name: '小行字幕组' },
  { provider: 'dmhy', providerId: '491', name: '黙示茶社' },
  { provider: 'dmhy', providerId: '492', name: 'TUcaptions' },
  { provider: 'dmhy', providerId: '494', name: '喵喵字幕組' },
  { provider: 'dmhy', providerId: '495', name: '76新番小组' },
  { provider: 'dmhy', providerId: '496', name: 'HTP字幕组' },
  { provider: 'dmhy', providerId: '497', name: '萌幻茶社' },
  { provider: 'dmhy', providerId: '498', name: 'KNA' },
  { provider: 'dmhy', providerId: '499', name: '天使羽音' },
  { provider: 'dmhy', providerId: '500', name: '白雪字幕社' },
  { provider: 'dmhy', providerId: '501', name: '天鹅之恋' },
  { provider: 'dmhy', providerId: '502', name: 'F宅字幕組' },
  { provider: 'dmhy', providerId: '503', name: 'TD字幕组' },
  { provider: 'dmhy', providerId: '504', name: 'LoveEcho!' },
  { provider: 'dmhy', providerId: '506', name: '银光字幕组' },
  { provider: 'dmhy', providerId: '507', name: '囧夏发布组' },
  { provider: 'dmhy', providerId: '508', name: 'DHK字幕組' },
  { provider: 'dmhy', providerId: '509', name: 'Non-Limit FanSubs' },
  { provider: 'dmhy', providerId: '512', name: 'BYSub' },
  { provider: 'dmhy', providerId: '513', name: '漫之学园' },
  { provider: 'dmhy', providerId: '515', name: 'U2娘@Share' },
  { provider: 'dmhy', providerId: '516', name: 'TFO字幕組' },
  { provider: 'dmhy', providerId: '517', name: '樱翼汉化组' },
  { provider: 'dmhy', providerId: '518', name: 'asdfe0' },
  { provider: 'dmhy', providerId: '519', name: '茉语字幕组' },
  { provider: 'dmhy', providerId: '520', name: '豌豆字幕组' },
  { provider: 'dmhy', providerId: '522', name: '梦物语字幕组' },
  { provider: 'dmhy', providerId: '525', name: '西农YUI汉化组' },
  { provider: 'dmhy', providerId: '526', name: '东京不够热' },
  { provider: 'dmhy', providerId: '527', name: '萌物百科字幕组' },
  { provider: 'dmhy', providerId: '529', name: '動漫萌系字幕組' },
  { provider: 'dmhy', providerId: '530', name: '萌物百科' },
  { provider: 'dmhy', providerId: '531', name: '清蓝动漫' },
  { provider: 'dmhy', providerId: '532', name: '傲娇零字幕组' },
  { provider: 'dmhy', providerId: '533', name: '花语发布' },
  { provider: 'dmhy', providerId: '534', name: 'THE一滅寂' },
  { provider: 'dmhy', providerId: '535', name: '楓漫漢化組' },
  { provider: 'dmhy', providerId: '536', name: 'Vmoe字幕組' },
  { provider: 'dmhy', providerId: '537', name: 'NEO·QSW' },
  { provider: 'dmhy', providerId: '538', name: '摸死團字幕組' },
  { provider: 'dmhy', providerId: '539', name: 'BRB' },
  { provider: 'dmhy', providerId: '540', name: '吐槽字幕组' },
  { provider: 'dmhy', providerId: '541', name: 'EggPainRaws' },
  { provider: 'dmhy', providerId: '542', name: '黒川実業字幕組' },
  { provider: 'dmhy', providerId: '543', name: 'Nyamazing字幕組' },
  { provider: 'dmhy', providerId: '544', name: '動漫流行館字幕組' },
  { provider: 'dmhy', providerId: '545', name: '天使羽翼字幕组' },
  { provider: 'dmhy', providerId: '547', name: '莳乃字幕屋' },
  { provider: 'dmhy', providerId: '550', name: '萝莉社活动室' },
  { provider: 'dmhy', providerId: '551', name: '宅宅合集' },
  { provider: 'dmhy', providerId: '552', name: '梦星字幕组' },
  { provider: 'dmhy', providerId: '553', name: '御宅同萌' },
  { provider: 'dmhy', providerId: '554', name: 'ErS贰石字幕组' },
  { provider: 'dmhy', providerId: '555', name: 'AOK字幕组' },
  { provider: 'dmhy', providerId: '556', name: '蔓越莓字幕组' },
  { provider: 'dmhy', providerId: '557', name: '聆风字幕组' },
  { provider: 'dmhy', providerId: '558', name: '星火字幕组' },
  { provider: 'dmhy', providerId: '559', name: '漫藤字幕组' },
  { provider: 'dmhy', providerId: '560', name: '绯蓝字幕组' },
  { provider: 'dmhy', providerId: '561', name: '钉铛字幕组' },
  { provider: 'dmhy', providerId: '562', name: '129.3字幕組' },
  { provider: 'dmhy', providerId: '563', name: '花園壓制組' },
  { provider: 'dmhy', providerId: '564', name: '风翼字幕组' },
  { provider: 'dmhy', providerId: '565', name: '茶会字幕组' },
  { provider: 'dmhy', providerId: '566', name: '聆风汉化组' },
  { provider: 'dmhy', providerId: '567', name: '雪梦字幕组' },
  { provider: 'dmhy', providerId: '568', name: '脸肿字幕组' },
  { provider: 'dmhy', providerId: '569', name: '盲点字幕组' },
  { provider: 'dmhy', providerId: '570', name: '時雨初空' },
  { provider: 'dmhy', providerId: '574', name: '梦蓝字幕组' },
  { provider: 'dmhy', providerId: '576', name: '银色子弹字幕组' },
  { provider: 'dmhy', providerId: '581', name: 'VCB-Studio' },
  { provider: 'dmhy', providerId: '582', name: '星冈汉化联合会' },
  { provider: 'dmhy', providerId: '583', name: 'あさいのお菓子屋' },
  { provider: 'dmhy', providerId: '584', name: '佳芸字幕组' },
  { provider: 'dmhy', providerId: '585', name: '雾雨字幕组' },
  { provider: 'dmhy', providerId: '587', name: 'PokerFans字幕组' },
  { provider: 'dmhy', providerId: '588', name: '梦奇字幕组' },
  { provider: 'dmhy', providerId: '589', name: '脑·洞字幕组' },
  { provider: 'dmhy', providerId: '592', name: '未央阁联盟' },
  { provider: 'dmhy', providerId: '593', name: '御宅爱萌家族' },
  { provider: 'dmhy', providerId: '596', name: '魂组' },
  { provider: 'dmhy', providerId: '597', name: 'DM1080P冷番组' },
  { provider: 'dmhy', providerId: '598', name: 'SNOW放映社(SnowSub)' },
  { provider: 'dmhy', providerId: '599', name: '暖萌的红烧鱼' },
  { provider: 'dmhy', providerId: '601', name: '繁星字幕组' },
  { provider: 'dmhy', providerId: '603', name: '风花字幕组' },
  { provider: 'dmhy', providerId: '604', name: 'c.c动漫' },
  { provider: 'dmhy', providerId: '605', name: '漫之岛动漫' },
  { provider: 'dmhy', providerId: '606', name: '天の翼字幕汉化社' },
  { provider: 'dmhy', providerId: '607', name: '萌族' },
  { provider: 'dmhy', providerId: '609', name: '断扎神教字幕组' },
  { provider: 'dmhy', providerId: '613', name: 'AI-Raws' },
  { provider: 'dmhy', providerId: '614', name: '神奇字幕组' },
  { provider: 'dmhy', providerId: '615', name: 'AVCHD' },
  { provider: 'dmhy', providerId: '616', name: '追放字幕组' },
  { provider: 'dmhy', providerId: '619', name: '桜都字幕组' },
  { provider: 'dmhy', providerId: '620', name: 'ay字幕组' },
  { provider: 'dmhy', providerId: '624', name: 'FIX字幕侠' },
  { provider: 'dmhy', providerId: '626', name: '驯兽师联盟' },
  { provider: 'dmhy', providerId: '627', name: '波洛咖啡厅' },
  { provider: 'dmhy', providerId: '628', name: 'CE家族社字幕组' },
  { provider: 'dmhy', providerId: '629', name: 'Yw7' },
  { provider: 'dmhy', providerId: '630', name: '枫叶字幕组' },
  { provider: 'dmhy', providerId: '631', name: '省电Raws' },
  { provider: 'dmhy', providerId: '632', name: '歐克勒亞' },
  { provider: 'dmhy', providerId: '636', name: 'ARIA吧汉化组' },
  { provider: 'dmhy', providerId: '637', name: '野猫字幕组' },
  { provider: 'dmhy', providerId: '638', name: 'LittleBakas!' },
  { provider: 'dmhy', providerId: '639', name: '仲夏动漫字幕组' },
  { provider: 'dmhy', providerId: '641', name: '冷番补完字幕组' },
  { provider: 'dmhy', providerId: '642', name: 'CYsub.蟾蜍字幕組' },
  { provider: 'dmhy', providerId: '644', name: 'DIGI-STUDIO' },
  { provider: 'dmhy', providerId: '645', name: '众神之王字幕组' },
  { provider: 'dmhy', providerId: '646', name: '夜楓字幕組' },
  { provider: 'dmhy', providerId: '647', name: '业界毒瘤' },
  { provider: 'dmhy', providerId: '648', name: '魔星字幕团' },
  { provider: 'dmhy', providerId: '649', name: '云光字幕组' },
  { provider: 'dmhy', providerId: '650', name: 'SweetSub' },
  { provider: 'dmhy', providerId: '651', name: '追新番字幕组' },
  { provider: 'dmhy', providerId: '652', name: 'SFEO-Raws' },
  { provider: 'dmhy', providerId: '653', name: 'The ARC-V Project' },
  { provider: 'dmhy', providerId: '654', name: '藍白條論壇·玖組' },
  { provider: 'dmhy', providerId: '655', name: '漫元字幕组' },
  { provider: 'dmhy', providerId: '656', name: '丢丢字幕组' },
  { provider: 'dmhy', providerId: '657', name: 'LoliHouse' },
  { provider: 'dmhy', providerId: '658', name: 'ACG调查小队' },
  { provider: 'dmhy', providerId: '659', name: '君の名は。FANS字幕組' },
  { provider: 'dmhy', providerId: '660', name: '2p3' },
  { provider: 'dmhy', providerId: '661', name: '鋼244' },
  { provider: 'dmhy', providerId: '663', name: '八重樱字幕组' },
  { provider: 'dmhy', providerId: '664', name: '虚数学区研究协会' },
  { provider: 'dmhy', providerId: '665', name: 'YWCN字幕组' },
  { provider: 'dmhy', providerId: '666', name: '中肯字幕組' },
  { provider: 'dmhy', providerId: '667', name: '海贼王微圈' },
  { provider: 'dmhy', providerId: '669', name: '喵萌奶茶屋' },
  { provider: 'dmhy', providerId: '670', name: 'MechaAnime_Fan_Sub' },
  { provider: 'dmhy', providerId: '672', name: '新番字幕组' },
  { provider: 'dmhy', providerId: '673', name: 'VRAINSTORM' },
  { provider: 'dmhy', providerId: '674', name: 'KaS製作組' },
  { provider: 'dmhy', providerId: '675', name: 'AikatsuFans' },
  { provider: 'dmhy', providerId: '676', name: '神帆字幕组' },
  { provider: 'dmhy', providerId: '677', name: '咖啡發佈' },
  { provider: 'dmhy', providerId: '678', name: '铜锣字幕组' },
  { provider: 'dmhy', providerId: '679', name: '咕咕茶字幕组' },
  { provider: 'dmhy', providerId: '680', name: 'Little字幕组' },
  { provider: 'dmhy', providerId: '682', name: '唯梦字幕组' },
  { provider: 'dmhy', providerId: '683', name: '哆啦字幕组' },
  { provider: 'dmhy', providerId: '684', name: 'MT字幕组' },
  { provider: 'dmhy', providerId: '686', name: 'HoneyGod' },
  { provider: 'dmhy', providerId: '687', name: 'BlueRabbit' },
  { provider: 'dmhy', providerId: '688', name: '物语系列圈' },
  { provider: 'dmhy', providerId: '689', name: '放学后的死神' },
  { provider: 'dmhy', providerId: '690', name: '虐心发布组' },
  { provider: 'dmhy', providerId: '691', name: '橙白字幕社' },
  { provider: 'dmhy', providerId: '693', name: '总有一天汉化组' },
  { provider: 'dmhy', providerId: '694', name: '咪路fans制作组' },
  { provider: 'dmhy', providerId: '695', name: 'c-a Raws' },
  { provider: 'dmhy', providerId: '697', name: 'NAZOrip' },
  { provider: 'dmhy', providerId: '700', name: 'Producer字幕組' },
  { provider: 'dmhy', providerId: '701', name: '狐狸小宮' },
  { provider: 'dmhy', providerId: '702', name: 'TenYun' },
  { provider: 'dmhy', providerId: '703', name: '届恋字幕组' },
  { provider: 'dmhy', providerId: '705', name: '小愿8压制组' },
  { provider: 'dmhy', providerId: '706', name: 'K&W-RAWS' },
  { provider: 'dmhy', providerId: '708', name: '青森小镇' },
  { provider: 'dmhy', providerId: '709', name: '飞龙骑脸字幕组(G.I.A.N.T)' },
  { provider: 'dmhy', providerId: '710', name: '咪梦动漫组' },
  { provider: 'dmhy', providerId: '711', name: '闺房调查团' },
  { provider: 'dmhy', providerId: '712', name: '闲人字幕联萌' },
  { provider: 'dmhy', providerId: '713', name: '萌FUN字幕组' },
  { provider: 'dmhy', providerId: '716', name: 'Astral Union字幕组' },
  { provider: 'dmhy', providerId: '717', name: 'AZT字幕组' },
  { provider: 'dmhy', providerId: '719', name: '80v08' },
  { provider: 'dmhy', providerId: '720', name: 'YMDR发布组' },
  { provider: 'dmhy', providerId: '721', name: '魯邦聯會' },
  { provider: 'dmhy', providerId: '723', name: '乐园字幕组' },
  { provider: 'dmhy', providerId: '724', name: 'SKY字幕组' },
  { provider: 'dmhy', providerId: '725', name: 'NoBody' },
  { provider: 'dmhy', providerId: '726', name: 'Mabors-Raws' },
  { provider: 'dmhy', providerId: '727', name: '2B4B' },
  { provider: 'dmhy', providerId: '728', name: '指原x櫻花字幕組' },
  { provider: 'dmhy', providerId: '729', name: 'YG字幕组' },
  { provider: 'dmhy', providerId: '730', name: '资源萌茶会' },
  { provider: 'dmhy', providerId: '731', name: '星空字幕组' },
  { provider: 'dmhy', providerId: '732', name: '肥猫压制' },
  { provider: 'dmhy', providerId: '734', name: 'TD-RAWS' },
  { provider: 'dmhy', providerId: '735', name: 'AcgN深雪' },
  { provider: 'dmhy', providerId: '736', name: '珞樱字幕社' },
  { provider: 'dmhy', providerId: '737', name: 'Rakka-Aria' },
  { provider: 'dmhy', providerId: '739', name: 'Clarita 压制组' },
  { provider: 'dmhy', providerId: '741', name: '銀月字幕組' },
  { provider: 'dmhy', providerId: '742', name: 'QS-Raws' },
  { provider: 'dmhy', providerId: '743', name: '神帆动漫' },
  { provider: 'dmhy', providerId: '749', name: '幻月字幕组' },
  { provider: 'dmhy', providerId: '752', name: '404GROUP' },
  { provider: 'dmhy', providerId: '753', name: '柠檬水字幕组' },
  { provider: 'dmhy', providerId: '754', name: 'BYYM发布组' },
  { provider: 'dmhy', providerId: '755', name: 'GMTeam' },
  { provider: 'dmhy', providerId: '757', name: 'RvE发布组' },
  { provider: 'dmhy', providerId: '759', name: '红鸟窝字幕组' },
  { provider: 'dmhy', providerId: '763', name: '光之家族字幕组' },
  { provider: 'dmhy', providerId: '764', name: 'MCE汉化组' },
  { provider: 'dmhy', providerId: '765', name: '爱咕字幕组' },
  { provider: 'dmhy', providerId: '767', name: '天月動漫&發佈組' },
  { provider: 'dmhy', providerId: '768', name: '千歲字幕組' },
  { provider: 'dmhy', providerId: '769', name: '动漫萌' },
  { provider: 'dmhy', providerId: '770', name: '檸檬好酸字幕組' },
  { provider: 'dmhy', providerId: '772', name: 'IET字幕組' },
  { provider: 'dmhy', providerId: '779', name: '银刃字幕组' },
  { provider: 'dmhy', providerId: '781', name: 'SW字幕组' },
  { provider: 'dmhy', providerId: '784', name: 'Voice Memories' },
  { provider: 'dmhy', providerId: '785', name: '野比家字幕组' },
  { provider: 'dmhy', providerId: '786', name: '棒聯貼吧字幕組' },
  { provider: 'dmhy', providerId: '787', name: 'STL字幕組' },
  { provider: 'dmhy', providerId: '788', name: 'ebbSub' },
  { provider: 'dmhy', providerId: '790', name: 'WBX-SUB' },
  { provider: 'dmhy', providerId: '792', name: 'ANS-Union' },
  { provider: 'dmhy', providerId: '794', name: 'Niconeiko Works' },
  { provider: 'dmhy', providerId: '795', name: '游離貓字幕組' },
  { provider: 'dmhy', providerId: '796', name: '臭臭动漫整合' },
  { provider: 'dmhy', providerId: '797', name: '森之屋动画组' },
  { provider: 'dmhy', providerId: '799', name: '白虎野' },
  { provider: 'dmhy', providerId: '800', name: 'TK-Raws' },
  { provider: 'dmhy', providerId: '801', name: 'NC-Raws' },
  { provider: 'dmhy', providerId: '802', name: '酷漫404' },
  { provider: 'dmhy', providerId: '803', name: 'Lilith-Raws' },
  { provider: 'dmhy', providerId: '804', name: '霜庭云花Sub' },
  { provider: 'dmhy', providerId: '805', name: 'DBD制作组' },
  { provider: 'dmhy', providerId: '806', name: '离谱Sub' },
  { provider: 'dmhy', providerId: '807', name: 'Liella!の烧烤摊' },
  { provider: 'dmhy', providerId: '808', name: '夜莺家族' },
  { provider: 'dmhy', providerId: '812', name: '虹咲学园烤肉同好会' },
  { provider: 'dmhy', providerId: '813', name: 'MingYSub' },
  { provider: 'dmhy', providerId: '814', name: 'Amor字幕组' },
  { provider: 'dmhy', providerId: '816', name: 'ANi' },
  { provider: 'dmhy', providerId: '817', name: 'EMe' },
  { provider: 'dmhy', providerId: '818', name: 'Alchemist' },
  { provider: 'dmhy', providerId: '819', name: '黑岩射手吧字幕组' },
  { provider: 'dmhy', providerId: '821', name: '百冬練習組' },
  { provider: 'dmhy', providerId: '822', name: '極彩字幕组' },
  { provider: 'dmhy', providerId: '823', name: '拨雪寻春' },
  { provider: 'dmhy', providerId: '824', name: '织梦字幕组' },
  { provider: 'dmhy', providerId: '825', name: '猎户发布组' },
  { provider: 'dmhy', providerId: '826', name: '秋人字幕' },
  { provider: 'dmhy', providerId: '827', name: '亿次研同好会' },
  { provider: 'dmhy', providerId: '828', name: '真龙会星际文件组' },
  { provider: 'dmhy', providerId: '829', name: '爪爪字幕组' },
  { provider: 'dmhy', providerId: '830', name: 'PorterRAWS' },
  { provider: 'dmhy', providerId: '831', name: 'lu-ul' },
  { provider: 'dmhy', providerId: '832', name: 'Sakura' },
  { provider: 'dmhy', providerId: '833', name: '北宇治字幕组' },
  { provider: 'dmhy', providerId: '834', name: '氢气烤肉架' },
  { provider: 'dmhy', providerId: '837', name: '六道我大鸽汉化组' },
  { provider: 'dmhy', providerId: '838', name: '云歌字幕组' },
  { provider: 'dmhy', providerId: '840', name: '成子坂地下室' },
  { provider: 'dmhy', providerId: '841', name: '失眠搬运组' },
  { provider: 'dmhy', providerId: '842', name: 'SRVFI-Raws' },
  { provider: 'dmhy', providerId: '843', name: 'Pharos of MyGO' }
];

type Fansub = (typeof AllFansubs)[0];
type Provider = 'dmhy';

const fansubIdCache = new Map<string, Fansub>();
const fansubNameCache = new Map<string, Fansub>();

export function findFansub(provider: Provider, text: number): Fansub | undefined;
export function findFansub(
  provider: Provider,
  text: string,
  options?: { fuzzy: boolean }
): Fansub | undefined;
export function findFansub(
  provider: Provider,
  text: number | string,
  options: { fuzzy: boolean } = { fuzzy: false }
) {
  if (typeof text === 'number' || /^\d+$/.test(text)) {
    if (fansubIdCache.size === 0) {
      AllFansubs.forEach((f) => fansubIdCache.set(`${f.provider}:${f.providerId}`, f));
    }
    return fansubIdCache.get(`${provider}:${text}`);
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
      if (fansubNameCache.size === 0) {
        AllFansubs.forEach((f) => fansubNameCache.set(`${f.provider}:${f.name}`, f));
      }
      return fansubNameCache.get(`${provider}:${text}`);
    }
  }
  return undefined;
}
