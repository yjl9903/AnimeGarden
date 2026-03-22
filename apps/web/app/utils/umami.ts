export const getDownloadTrackEvent = (provider: string, providerId: string) => ({
  'data-umami-event': 'download',
  'data-umami-event-resource': `${provider}:${providerId}`
});

export const getPikPakTrackEvent = (provider: string, providerId: string) => ({
  'data-umami-event': 'pikpak',
  'data-umami-event-resource': `${provider}:${providerId}`
});

export const getOpenFeedTrackEvent = () => ({
  'data-umami-event': 'feed.open'
});

interface ErrorTrackingPayload {
  path: string;
  error: string;
}

export interface TrackErrorRenderPayload extends ErrorTrackingPayload {}

export interface TrackResourcesFetchErrorPayload extends ErrorTrackingPayload {}

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
