import { type ProviderType, SupportProviders } from '@animegarden/client';

export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function isSupportedProvider(provider: string): provider is ProviderType {
  return SupportProviders.includes(provider as ProviderType);
}

export function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function buildResourceUri(provider: string, providerId: string) {
  return `animegarden://resources/${provider}/${encodeURIComponent(providerId)}`;
}
