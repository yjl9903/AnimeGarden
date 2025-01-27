import { toast } from 'sonner';
import { committerDate as latestDate } from '~build/git';

const event = {
  date: new Date(`Mon Jan 29 2024 21:37:26 GMT+0800`),
  toast: () => {
    toast(`AnimeGarden 更新通知`, {
      description: (
        <div className="mt-1 space-y-1">
          <p>AnimeGarden 近期正在进行迁移.</p>
          <p>请更新相关收藏链接和 RSS 订阅链接.</p>
          <p>
            问题反馈:{' '}
            <a href="https://github.com/yjl9903/AnimeGarden/issues" className="text-link-active">
              yjl9903/AnimeGarden
            </a>{' '}
            <a href="https://t.me/animegarden_dev" className="text-link-active">
              Telegram
            </a>
          </p>
        </div>
      ),
      position: 'top-right',
      important: true,
      closeButton: true,
      duration: 10 * 1000
    });
  }
};

event.toast();

document.addEventListener(
  'astro:page-load',
  () => {
    // TODO
  },
  { once: true }
);
