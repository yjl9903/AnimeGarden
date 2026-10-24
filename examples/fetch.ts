import { fetchResources } from '@animegarden/client';

const result = await fetchResources({
  subject: 543360,
  fansub: '喵萌奶茶屋',
  keywords: ['简日']
});

if (!result.ok) {
  throw result.error;
}

console.log(result.resources);
