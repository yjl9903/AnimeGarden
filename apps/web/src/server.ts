import handler, { createServerEntry } from '@tanstack/react-start/server-entry';

import { createEarlyHintLinkFilter } from './utils/early-hints';

export default createServerEntry({
  fetch(request, opts) {
    const filterEarlyHintLink = createEarlyHintLinkFilter();

    return handler.fetch(request, {
      ...opts,
      responseLinkHeader: { filter: filterEarlyHintLink }
    });
  }
});
