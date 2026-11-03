import { toast } from 'sonner';

import { getReact } from '../react.js';
import type { TranslateFunction } from '../i18n.js';

/**
 * Copy a magnet URI: the download action cannot navigate to `magnet:` inside the
 * host shell, so it copies the link and reports the outcome in a toast.
 * @param t - locale translate function.
 * @returns the clipboard callback used by the row download action.
 */
export function useMagnetCopy(t: TranslateFunction): (magnet: string) => Promise<void> {
  const React = getReact();
  return React.useCallback(
    async (magnet: string): Promise<void> => {
      let copied = false;
      try {
        await navigator.clipboard.writeText(magnet);
        copied = true;
      } catch {
        // Fallback for shells without the async clipboard permission.
        try {
          const area = document.createElement('textarea');
          area.value = magnet;
          area.setAttribute('readonly', '');
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.append(area);
          area.select();
          copied = document.execCommand('copy');
          area.remove();
        } catch {
          copied = false;
        }
      }
      if (copied) {
        toast.success(t('copyMagnetSuccess'));
      } else {
        toast.error(t('copyMagnetFailed'));
      }
    },
    [t]
  );
}
