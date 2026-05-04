import clsx from 'clsx';
import { useAtomValue } from 'jotai';
import { memo, useEffect, useRef, useState } from 'react';
import { NavLink } from '@remix-run/react';

import {
  fetchTimestamp,
  formatChinaTime,
  getFeedURL,
  getOpenFeedTrackEvent,
  trackFooterExternalLinkClick
} from '~/utils';

import { ThemeToggle } from './ThemeToggle';
import { isOpenSidebar } from './Sidebar';

export interface FooterProps {
  timestamp: Date | undefined;

  feedURL: string | undefined;
}

export const Footer = memo((props: FooterProps) => {
  const isOpen = useAtomValue(isOpenSidebar);

  const { timestamp: timestampInput, feedURL } = props;
  const resolvedFeedURL = feedURL ?? getFeedURL();

  const ref = useRef<{ timestamp?: string }>({});
  if (timestampInput) {
    if (!ref.current) ref.current = {};
    ref.current.timestamp = timestampInput.toISOString();
  }

  const [timestamp, setTimestamp] = useState(
    (timestampInput ?? ref.current?.timestamp)
      ? new Date(timestampInput ?? ref.current.timestamp!)
      : undefined
  );

  const [loading, setLoading] = useState(timestamp ? false : true);

  useEffect(() => {
    if (!timestamp) {
      fetchTimestamp()
        .then((t) => {
          if (t.timestamp) {
            ref.current.timestamp = t.timestamp.toISOString();
            setTimestamp(new Date(t.timestamp));
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [timestamp]);

  const onExternalLinkClick = (section: string, label: string, href: string) => () =>
    trackFooterExternalLinkClick({ section, label, href });

  return (
    <footer
      className={clsx(
        isOpen && 'main-with-sidebar',
        'w-full',
        'relative',
        'flex',
        'justify-center',
        'border-t border-t-1 py-6 h-[252px] bg-hero'
      )}
    >
      <div className={clsx('main', 'w-full')}>
        <div className={clsx('[&_a:hover]:underline', 'lt-sm:text-sm')}>
          <div className="flex">
            <span className="text-base-900 font-bold select-none">状态</span>
            <span className="i-carbon:chevron-right text-xl lt-sm:text-base text-base-900 font-bold select-none relative top-[2px]"></span>
            <a
              href="https://uptime.animes.garden/status/animegarden"
              target="_blank"
              className="ml-2"
              onClick={onExternalLinkClick(
                '状态',
                '监控',
                'https://uptime.animes.garden/status/animegarden'
              )}
            >
              监控
            </a>
            <span className="ml-4 lt-sm:ml-2">
              {timestamp
                ? '数据更新于 ' + formatChinaTime(timestamp)
                : !loading
                  ? '服务器错误'
                  : ' '}
            </span>
          </div>
          <div className="flex mt-2">
            <span className="text-base-900 font-bold select-none">源站</span>
            <span className="i-carbon:chevron-right text-xl lt-sm:text-base text-base-900 font-bold select-none relative top-[2px]"></span>
            <a
              href="https://share.dmhy.org/"
              target="_blank"
              className="ml-2"
              onClick={onExternalLinkClick('源站', '動漫花園', 'https://share.dmhy.org/')}
            >
              動漫花園
            </a>
            <a
              href="https://mikanani.me/"
              target="_blank"
              className="ml-4"
              onClick={onExternalLinkClick('源站', '蜜柑计划', 'https://mikanani.me/')}
            >
              蜜柑计划
            </a>
            <a
              href="https://bangumi.moe/"
              target="_blank"
              className="ml-4"
              onClick={onExternalLinkClick('源站', '萌番组', 'https://bangumi.moe/')}
            >
              萌番组
            </a>
            <a
              href="https://open.ani.rip/"
              target="_blank"
              className="ml-4"
              onClick={onExternalLinkClick('源站', 'ANi', 'https://open.ani.rip/')}
            >
              ANi
            </a>
          </div>
          <div className="flex mt-2">
            <span className="text-base-900 font-bold select-none">关于</span>
            <span className="i-carbon:chevron-right text-xl lt-sm:text-base text-base-900 font-bold select-none relative top-[2px]"></span>
            <a
              href="https://github.com/yjl9903/AnimeGarden"
              target="_blank"
              className="ml-2"
              onClick={onExternalLinkClick(
                '关于',
                'GitHub',
                'https://github.com/yjl9903/AnimeGarden'
              )}
            >
              GitHub
            </a>
            <a
              href="https://docs.animes.garden"
              target="_blank"
              className="ml-4 lt-sm:ml-2"
              onClick={onExternalLinkClick('关于', 'AnimeSpace 计划', 'https://docs.animes.garden')}
            >
              AnimeSpace 计划
            </a>
          </div>
          <div className="flex mt-2">
            <span className="text-base-900 font-bold select-none">开放</span>
            <span className="i-carbon:chevron-right lt-sm:text-base text-base-900 text-xl font-bold select-none relative top-[2px]"></span>
            <a
              href="https://github.com/yjl9903/AnimeGarden?tab=readme-ov-file#%E4%BD%BF%E7%94%A8-skills"
              target="_blank"
              className="ml-2 lt-sm:ml-2"
              onClick={onExternalLinkClick(
                '开放',
                'Agent Skills',
                'https://github.com/yjl9903/AnimeGarden?tab=readme-ov-file#%E4%BD%BF%E7%94%A8-skills'
              )}
            >
              Agent Skills
            </a>
            <a
              href="https://github.com/yjl9903/AnimeGarden?tab=readme-ov-file#%E4%BD%BF%E7%94%A8-mcp"
              target="_blank"
              className="ml-4 lt-sm:ml-2"
              onClick={onExternalLinkClick(
                '开放',
                'MCP',
                'https://github.com/yjl9903/AnimeGarden?tab=readme-ov-file#%E4%BD%BF%E7%94%A8-mcp'
              )}
            >
              MCP
            </a>
            <NavLink to="/docs/api" className="ml-4 lt-sm:ml-2">
              API 文档
            </NavLink>
          </div>
          <div className="flex mt-2">
            <span className="text-base-900 font-bold select-none">更多</span>
            <span className="i-carbon:chevron-right lt-sm:text-base text-base-900 text-xl font-bold select-none relative top-[2px]"></span>
            <a
              href="https://t.me/animegarden_dev"
              target="_blank"
              className="ml-2 lt-sm:ml-2"
              onClick={onExternalLinkClick('更多', 'Telegram', 'https://t.me/animegarden_dev')}
            >
              Telegram
            </a>
            <a
              href="https://github.com/yjl9903/AnimeGarden/issues"
              target="_blank"
              className="ml-4 lt-sm:ml-2"
              onClick={onExternalLinkClick(
                '更多',
                '问题反馈',
                'https://github.com/yjl9903/AnimeGarden/issues'
              )}
            >
              问题反馈
            </a>
            <a
              href="https://docs.animes.garden/animegarden/search"
              target="_blank"
              className="ml-4 lt-sm:ml-2"
              onClick={onExternalLinkClick(
                '更多',
                '帮助文档',
                'https://docs.animes.garden/animegarden/search'
              )}
            >
              帮助文档
            </a>
          </div>
          <div className="flex justify-between items-center mt-8">
            <div>
              <span>
                © 2022{' '}
                <a
                  href="https://github.com/animegarden"
                  target="_blank"
                  onClick={onExternalLinkClick(
                    '版权',
                    'Anime Space',
                    'https://github.com/animegarden'
                  )}
                >
                  Anime Space
                </a>
                .
              </span>
              <span> | </span>
              <span>
                <a href={resolvedFeedURL} {...getOpenFeedTrackEvent(resolvedFeedURL)}>
                  RSS
                </a>
              </span>
              <span> | </span>
              <span>
                <a href="/sitemap-index.xml">站点地图</a>
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
});
