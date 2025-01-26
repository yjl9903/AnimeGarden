export const SupportProviders = ['dmhy', 'moe', 'ani'] as const;

export type ProviderType = (typeof SupportProviders)[number];
