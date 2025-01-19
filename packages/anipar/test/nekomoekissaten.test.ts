import { describe, it, expect } from 'vitest';

import { parse } from '../src';

const titles = [
  '【喵萌奶茶屋】★剧场版★[欢迎来到驹田蒸馏所 / 駒田蒸留所へようこそ / Komada Jouryuujo e Youkoso][BDRip][1080p][简日双语][招募翻译时轴]',
  '【喵萌奶茶屋】★劇場版★[歡迎來到駒田蒸餾所 / 駒田蒸留所へようこそ / Komada Jouryuujo e Youkoso][BDRip][1080p][繁日雙語][招募翻譯時軸]',
  '【喵萌奶茶屋】★10月新番★[乱马 1/2 2024年版 / Ranma ½ / Ranma 1/2 (2024)][11][1080p][简日双语][招募翻译]',
  '【喵萌奶茶屋】★10月新番★[亂馬 1/2 2024年版 / Ranma ½ / Ranma 1/2 (2024)][11][1080p][繁日雙語][招募翻譯]',
  '【喵萌奶茶屋】★10月新番★[青箱 / Ao no Hako / Blue Box][12][1080p][繁日雙語][招募翻譯]',
  '【喵萌奶茶屋】★10月新番★[Chi。-关于地球的运动- / Chi. Chikyuu no Undou ni Tsuite][11][1080p][简日双语][招募翻译]',
  '【喵萌奶茶屋】★10月新番★[青箱 / Ao no Hako / Blue Box][12][1080p][简日双语][招募翻译]',
  '【喵萌奶茶屋】★10月新番★[妻子變成小學生。 / Tsuma, Shougakusei ni Naru][09][1080p][繁日雙語][招募翻譯時軸]',
  '【喵萌奶茶屋】★10月新番★[妻子变成小学生。 / Tsuma, Shougakusei ni Naru][09][1080p][简日双语][招募翻译时轴]',
  '【喵萌奶茶屋】★10月新番★[超自然武裝噹噠噹 / 膽大黨 / Dandadan][11][1080p][繁日雙語][招募翻譯]',
  '【喵萌奶茶屋】★10月新番★[超自然武装当哒当 / 胆大党 / Dandadan][11][1080p][简日双语][招募翻译]',
  '【喵萌奶茶屋】★10月新番★[神選 / KamiErabi / GOD.app][23][1080p][繁日雙語][招募翻譯]',
  '【喵萌奶茶屋】★10月新番★[神选 / KamiErabi / GOD.app][23][1080p][简日双语][招募翻译]',
  '【喵萌奶茶屋】★07月新番★[亚托莉 我挚爱的时光 / ATRI - My Dear Moments][01-13][1080p][简日双语][招募翻译时轴]',
  '【喵萌奶茶屋】★07月新番★[亞托莉 我摯愛的時光 / ATRI - My Dear Moments][01-13][1080p][繁日雙語][招募翻譯時軸]',
  '【喵萌奶茶屋】★10月新番★[冻牌 / Touhai: Ura Rate Mahjong Touhai Roku][10][1080p][简体][招募翻译]',
  '【喵萌奶茶屋】★07月新番★[神之塔 二期 / Tower of God S2][20][1080p][繁體][招募翻譯]',
  '【喵萌奶茶屋】★10月新番★[乱马 1/2 2024年版 / Ranma ½ / Ranma 1/2 (2024)][10][1080p][简日双语][招募翻译]',
  '【喵萌奶茶屋】★07月新番★[神之塔 二期 / Tower of God S2][22][1080p][繁體][招募翻譯]',
  '【喵萌奶茶屋】★07月新番★[神之塔 二期 / Tower of God S2][21][1080p][繁體][招募翻譯]',
  '【喵萌奶茶屋】★07月新番★[神之塔 二期 / Tower of God S2][20][1080p][简体][招募翻译]',
  '【喵萌奶茶屋】★10月新番★[凍牌 / Touhai: Ura Rate Mahjong Touhai Roku][10][1080p][繁體][招募翻譯]',
  '【喵萌奶茶屋】★07月新番★[神之塔 二期 / Tower of God S2][21][1080p][简体][招募翻译]',
  '【喵萌奶茶屋】★07月新番★[神之塔 二期 / Tower of God S2][22][1080p][简体][招募翻译]',
  '【喵萌奶茶屋】★10月新番★[亂馬 1/2 2024年版 / Ranma ½ / Ranma 1/2 (2024)][10][1080p][繁日雙語][招募翻譯]',
  '【喵萌奶茶屋】★10月新番★[青箱 / Ao no Hako / Blue Box][11][1080p][繁日雙語][招募翻譯]',
  '【喵萌Production】★10月新番★[LoveLive! 超級明星!! 3期 / Love Live! Superstar!! S3][07][1080p][繁日雙語][招募翻譯]'
];

describe('nekomoekissaten', () => {
  for (const title of titles) {
    it(title, () => {
      expect(parse(title)).toMatchSnapshot();
    });
  }
});
