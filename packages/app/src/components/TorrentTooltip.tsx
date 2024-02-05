import { useState } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export function TorrentTooltip() {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger
          className="ml-2 inline-flex items-center"
          onTouchStart={() => setOpen(true)}
        >
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
