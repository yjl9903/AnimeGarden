import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { memo, useRef } from 'react';
import { NavLink } from '@remix-run/react';

import { formatChinaTime } from '~/utils';

import { isOpenSidebar } from './Sidebar';

export interface FooterProps {
  timestamp: string | undefined;

  feedURL: string | undefined;
}

export const Footer = memo((props: FooterProps) => {
  const isOpen = useAtomValue(isOpenSidebar);

  const ref = useRef<{ timestamp?: string }>({});
  const { timestamp: timestampStr, feedURL } = props;
  if (timestampStr) {
    if (!ref.current) ref.current = {};
    ref.current.timestamp = timestampStr;
  }
  const timestamp =
    (timestampStr ?? ref.current?.timestamp)
      ? new Date(timestampStr ?? ref.current.timestamp!)
      : undefined;

  return (
    <footer
      className={clsx(
        isOpen && 'main-with-sidebar',
        'w-full',
        'relative',
        'flex',
        'justify-center',
        'border-t border-t-1 py-6 h-[196px] bg-[#fef8f7]'
      )}
    >
      <div className={clsx('main', 'w-full')}>
        <div className={clsx('[&_a:hover]:underline', 'text-main-600', 'lt-sm:text-sm')}>
          <div className="flex">
            <span className="text-main-900 font-bold select-none">状态</span>
            <span className="i-carbon:chevron-right text-xl lt-sm:text-base text-main-900 font-bold select-none relative top-[2px]"></span>
            <span className="ml-2 lt-sm:ml-2">
              {timestamp ? '数据更新于 ' + formatChinaTime(timestamp) : '服务器错误'}
            </span>
          </div>
          <div className="flex mt-2">
            <span className="text-main-900 font-bold select-none">关于</span>
            <span className="i-carbon:chevron-right text-xl lt-sm:text-base text-main-900 font-bold select-none relative top-[2px]"></span>
            <NavLink to="/about" className="ml-2 lt-sm:ml-2">
              关于本站
            </NavLink>
            <a
              href="https://github.com/yjl9903/AnimeGarden"
              target="_blank"
              className="ml-4 lt-sm:ml-2"
            >
              GitHub
            </a>
            <a href="https://animespace.onekuma.cn" target="_blank" className="ml-4 lt-sm:ml-2">
              AnimeSpace 计划
            </a>
          </div>
          <div className="flex mt-2">
            <span className="text-main-900 font-bold select-none">更多</span>
            <span className="i-carbon:chevron-right lt-sm:text-base text-main-900 text-xl font-bold select-none relative top-[2px]"></span>
            <a href="https://t.me/animegarden_dev" target="_blank" className="ml-2 lt-sm:ml-2">
              Telegram
            </a>
            <a
              href="https://github.com/yjl9903/AnimeGarden/issues"
              target="_blank"
              className="ml-4 lt-sm:ml-2"
            >
              问题反馈
            </a>
            <a
              href="https://animespace.onekuma.cn/animegarden/search"
              target="_blank"
              className="ml-4 lt-sm:ml-2"
            >
              帮助文档
            </a>
            <a href="https://status.onekuma.cn/" target="_blank" className="ml-4 lt-sm:ml-2">
              监控
            </a>
          </div>
          <div className="flex justify-center mt-8">
            <div className="">
              <span>
                © 2022-2025{' '}
                <a href="https://github.com/animegarden" target="_blank">
                  Anime Garden
                </a>
                .
              </span>
              <span> | </span>
              <span>
                <a href={feedURL ?? '/feed.xml'}>RSS</a>
              </span>
              <span> | </span>
              <span>
                <a href="/sitemap-index.xml">站点地图</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});
