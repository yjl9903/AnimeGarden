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

const track = (event: string) => {
  try {
    // @ts-ignore
    if (!umami) return;
    // @ts-ignore
    umami.track(event);
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
