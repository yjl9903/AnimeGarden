const DefaultBaseURL = 'https://garden.breadio.wiki/api/';

export const SupportProviders = ['dmhy', 'moe', 'ani'] as const;

export type ProviderType = (typeof SupportProviders)[number];
