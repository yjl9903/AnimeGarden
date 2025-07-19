import { fetchResources } from '@animegarden/client';

const resources = await fetchResources({
  subjects: [528438],
  fansubs: ["桜都字幕组"],
  keywords: ["简体"],
  after: new Date('2025-06-29T00:00:00.000Z')
});

console.log(resources);
