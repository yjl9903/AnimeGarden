export const getDownloadTrackEvent = (provider: string, providerId: string) => ({
  'data-umami-event': 'download',
  'data-umami-event-resource': `${provider}:${providerId}`
});

export const getPikPakTrackEvent = (provider: string, providerId: string) => ({
  'data-umami-event': 'pikpak',
  'data-umami-event-resource': `${provider}:${providerId}`
});

export const getOpenFeedTrackEvent = (href: string) => ({
  onClick: () => track('feed.open', { href })
});

export type NavTrackType = 'home' | 'anime' | 'fansub' | 'type';

export type SearchTriggerSource = 'button' | 'command' | 'history' | 'result-more';

export type ResourceRefineFilterType = 'type' | 'fansub' | 'publisher';

interface ErrorTrackingPayload {
  path: string;
  error: string;
}

export interface TrackErrorRenderPayload extends ErrorTrackingPayload {}

export interface TrackResourcesFetchErrorPayload extends ErrorTrackingPayload {}

export interface TrackNavClickPayload extends Record<string, string> {
  item: string;
}

export interface TrackSearchTriggerPayload {
  text: string;
  source: SearchTriggerSource;
}

export interface TrackSearchHistoryDeletePayload {
  action: 'clear' | 'remove';
  text?: string;
  count?: string;
}

export interface TrackResourceMoreClickPayload {
  provider: string;
  providerId: string;
  type: string;
}

export interface TrackFooterExternalLinkPayload {
  section: string;
  label: string;
  href: string;
}

export const track = (event: string, payload?: Record<string, string>) => {
  try {
    // @ts-ignore
    if (!window.umami) return;
    // @ts-ignore
    umami.track(event, payload);
  } catch (error) {
    console.error(error);
  }
};

function buildTrackPayload(
  payload: TrackErrorRenderPayload | TrackResourcesFetchErrorPayload
): Record<string, string> {
  return {
    path: payload.path,
    error: payload.error
  };
}

export const trackAddCollection = () => {
  track('collection.add');
};

export const trackCopyFeed = () => {
  track('copy.feed');
};

export const trackCopyMagnetLinks = () => {
  track('copy.magnet-links');
};

export const trackCopyJSONData = () => {
  track('copy.json');
};

export const trackCopyFetchCurl = () => {
  track('copy.fetch', { language: 'curl' });
};

export const trackCopyFetchJS = () => {
  track('copy.fetc', { language: 'javascript' });
};

export const trackCopyFetchPython = () => {
  track('copy.fetch', { language: 'python' });
};

export const trackCopyIframe = () => {
  track('copy.iframe');
};

export const trackRenderError = (payload: TrackErrorRenderPayload) => {
  track('error.render', buildTrackPayload(payload));
};

export const trackFetchResourcesError = (payload: TrackResourcesFetchErrorPayload) => {
  track('error.fetch-resources', buildTrackPayload(payload));
};

export const trackNavClick = (type: NavTrackType, payload?: TrackNavClickPayload) => {
  track(`nav.click.${type}`, payload);
};

export const trackSearchTrigger = (payload: TrackSearchTriggerPayload) => {
  track('search.trigger', {
    text: payload.text,
    source: payload.source
  });
};

export const trackSearchHistoryClick = (text: string) => {
  track('search.history.click', { text });
};

export const trackSearchHistoryDelete = (payload: TrackSearchHistoryDeletePayload) => {
  const result: Record<string, string> = {
    action: payload.action
  };

  if (payload.text) {
    result.text = payload.text;
  }

  if (payload.count) {
    result.count = payload.count;
  }

  track('search.history.delete', result);
};

export const trackResourceMoreClick = (payload: TrackResourceMoreClickPayload) => {
  track('resources.more.click', {
    resource: `${payload.provider}:${payload.providerId}`,
    type: payload.type
  });
};

export const trackResourceRefineFilterClick = (
  filterType: ResourceRefineFilterType,
  value: string
) => {
  track('resources.filter.click', {
    filterType,
    value
  });
};

export const trackFooterExternalLinkClick = (payload: TrackFooterExternalLinkPayload) => {
  track('footer.link.click', {
    section: payload.section,
    label: payload.label,
    href: payload.href
  });
};
