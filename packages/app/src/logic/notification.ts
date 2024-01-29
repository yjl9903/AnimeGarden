import { toast } from 'sonner';

import { committerDate } from '../state';

document.addEventListener('astro:page-load', () => {
  console.log('commiter', committerDate.get());
});
