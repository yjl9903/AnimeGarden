import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const SSR_ADAPTER = process.env.SSR_ADAPTER === 'cloudflare' ? 'cloudflare' : 'node';
if (SSR_ADAPTER === 'node') {
  process.exit(0);
}

const __dirname = path.join(fileURLToPath(import.meta.url), '../../');

const outputDist = path.join(__dirname, '../../dist');
const outputFunc = path.join(__dirname, '../../functions');

await fs.rm(outputDist, { recursive: true }).catch(() => {});
await fs.rm(outputFunc, { recursive: true }).catch(() => {});
await fs.copy(path.join(__dirname, 'dist'), outputDist);
await fs.copy(path.join(__dirname, 'functions'), outputFunc);
