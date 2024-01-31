import { registerSW } from 'virtual:pwa-register';

import { toast } from 'sonner';

document.addEventListener('astro:page-load', () => {
  const udpateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      toast(`发现应用更新`, {
        important: true,
        closeButton: true,
        duration: 60 * 60 * 1000,
        description: '是否进行更新?',
        action: {
          label: '更新',
          onClick: () => {
            udpateSW();
          }
        }
        // cancel: {
        //   label: '取消',
        //   onClick: () => {}
        // }
      });
    },
    onNeedRefresh() {
      toast(`发现应用更新`, {
        important: true,
        closeButton: true,
        duration: 60 * 60 * 1000,
        description: '是否进行更新?',
        action: {
          label: '更新',
          onClick: () => {
            udpateSW();
          }
        }
        // cancel: {
        //   label: '取消',
        //   onClick: () => {}
        // }
      });
    },
    onRegisteredSW(swScriptUrl) {
      console.log('SW registered: ', swScriptUrl);
    }
  });
});
