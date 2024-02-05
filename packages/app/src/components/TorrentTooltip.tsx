import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export function TorrentTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="ml-2 inline-flex items-center">
          <span className="i-carbon-help text-xl"></span>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            桌面端推荐使用{' '}
            <a
              href="https://www.qbittorrent.org/"
              target="_blank"
              className="text-link text-link-active"
            >
              qBittorrent
            </a>{' '}
            下载
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
