import { breadc } from 'breadc';

import { version } from '../package.json';

const cli = breadc('animegarden', { version });

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
