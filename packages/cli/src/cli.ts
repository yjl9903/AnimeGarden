import { breadc } from 'breadc';

import { version } from '../package.json';

const cli = breadc('animegarden', { version });

cli
  .command('fetch <dmhy|moe>', 'Fetch resources list')
  .option('-o, --out-dir <dir>', { description: 'Output dir', default: 'output' })
  .option('--from <page>', { description: 'Fetch from page', default: '1' })
  .option('--to <page>', { description: 'Fetch to page, leave empty for all the data' })
  .action(async (platform, options) => {
    if (platform === 'dmhy') {
      const { fetchDmhy } = await import('./commands/dmhy');
      await fetchDmhy(+options.from, options.to ? +options.to : undefined, options.outDir);
    } else if (platform === 'moe') {
      throw new Error('unimplemented');
    }
  });

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
