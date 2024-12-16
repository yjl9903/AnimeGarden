import { app } from './app';

async function main() {
  await app.run(process.argv.slice(2)).catch((err) => console.error(err));
}

main();
