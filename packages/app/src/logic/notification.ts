import { toast } from 'sonner';
import { committerDate as latestDate } from '~build/git';

import { committerDate } from '../state';

const event = {
  date: new Date(`Mon Jan 29 2024 21:37:26 GMT+0800`),
  toast: () => {
    const content = [
      `AnimeGarden 近期正在进行代码重构和服务器迁移.`,
      `优化了搜索的响应速度.`,
      `部分 RSS 订阅链接可能需要重新获取.`,
      `问题反馈: https://github.com/yjl9903/AnimeGarden/issues`
    ].join('\n');
    toast(`AnimeGarden 更新通知`, {
      description: content,
      important: true,
      closeButton: true,
      duration: 10 * 1000
    });
  }
};

document.addEventListener('astro:page-load', () => {
  const date = committerDate.get() ? committerDate.get() : new Date(0);
  if (date.getTime() < event.date.getTime()) {
    event.toast();
  }
});
