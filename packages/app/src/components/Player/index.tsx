import { useEffect } from 'react';
import { useStore } from '@nanostores/react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import { Skeleton } from '../ui/skeleton';

import { PlayerState } from './state';

export function Player() {
  const { open: isOpen, file, loading = false } = useStore(PlayerState);

  if (!file) return;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => PlayerState.set({ open, loading: true })}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>播放 {file.split('/').at(-1)}</DialogTitle>
          {/* <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription> */}
        </DialogHeader>
        <div className="w-full max-h-[70vh]">
          {loading && <Skeleton className="w-full h-[40vw]"></Skeleton>}
          <video
            id="video-container"
            className={`video-js w-full ${loading ? 'hidden' : 'block'}`}
            data-setup="{}"
            controls={true}
          ></video>
        </div>
        <DialogFooter className="sm:justify-start">
          <div className="flex items-center">
            <span className="i-ant-design:experiment-outlined text-xl mr-1"></span>
            <span>实验性功能: 下载和播放受制于你的网络环境。</span>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
