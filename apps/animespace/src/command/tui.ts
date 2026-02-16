import { dim } from 'breadc';
import type { System } from '../system/system.ts';

export interface PrintListOptions {
  type?: 'bullet' | 'ordered';

  json?: boolean;

  footer?: () => string[] | void | undefined | null | false;
}

export function printList<T>(
  system: System,
  list: T[],
  renderTTY: (item: T, index: number) => string | string[],
  renderNonTTY: (item: T, index: number) => string,
  options: PrintListOptions = {}
) {
  if (options.json) {
    system.logger.log(JSON.stringify(list, null, 2));
  } else if (!!system.logger.stream.isTTY) {
    const symbolLength = options.type === 'bullet' ? 1 : String(list.length + 1).length + 1;
    for (let i = 0; i < list.length; i++) {
      const result = renderTTY(list[i], i);
      const lines = typeof result === 'string' ? [result] : result;
      const symbol =
        options.type === 'bullet' ? '•' : dim((String(i + 1) + '.').padStart(symbolLength, ' '));
      system.logger.log(symbol + ' ' + lines[0]);
      for (const line of lines.slice(1)) {
        system.logger.log(' '.repeat(symbolLength) + ' ' + line);
      }
    }

    if (options.footer) {
      const result = options.footer();
      if (result && result.length > 0) {
        system.logger.log();
        for (const line of result) {
          system.logger.log(line);
        }
      }
    }
  } else {
    for (let i = 0; i < list.length; i++) {
      const result = renderNonTTY(list[i], i);
      system.logger.log(result);
    }
  }
}
