export const getDownloadEvent = (provider: string, providerId: string) =>
  `download:${provider}:${providerId}`;

export const getPikPakEvent = (provider: string, providerId: string) =>
  `pikpak:${provider}:${providerId}`;
