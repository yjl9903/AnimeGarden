export const getDownloadTrackEvent = (provider: string, providerId: string) => ({
  'data-umami-event': 'download',
  'data-umami-event-resource': `${provider}:${providerId}`
});

export const getPikPakTrackEvent = (provider: string, providerId: string) => ({
  'data-umami-event': 'pikpak',
  'data-umami-event-resource': `${provider}:${providerId}`
});

export const getOpenFeedTrackEvent = () => ({
  'data-umami-event': 'open-feed'
});

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

export const trackAddCollection = () => {
  track('add-collection');
};

export const trackCopyFeed = () => {
  track('copy-feed');
};

export const trackCopyMagnetLinks = () => {
  track('copy-magnet-links');
};

export const trackCopyJSONData = () => {
  track('copy-json-data');
};

export const trackCopyFetchCurl = () => {
  track('copy-fetch-code', { language: 'curl' });
};

export const trackCopyFetchJS = () => {
  track('copy-fetch-code', { language: 'javascript' });
};

export const trackCopyFetchPython = () => {
  track('copy-fetch-code', { language: 'python' });
};

export const trackCopyIframe = () => {
  track('copy-iframe-code');
};
