import { Jieba } from '@node-rs/jieba';
import { dict } from '@node-rs/jieba/dict.js';

export const jieba = Jieba.withDict(dict);
