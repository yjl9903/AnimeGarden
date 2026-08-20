import { type ProviderType, SupportProviders, fetchAPI } from '@animegarden/client';

export interface AdminRequestOptions {
  secret?: string;

  url?: string;

  fetch?: typeof globalThis.fetch;
}

/** Sends an authenticated request to an Anime Garden admin endpoint. */
export async function requestAdminAPI<T>(
  path: string,
  init: RequestInit,
  options: AdminRequestOptions
) {
  // Prefer an explicit CLI value, then fall back to secrets loaded from .env.
  const secret =
    options.secret?.trim() || process.env.ADMIN_SECRET?.trim() || process.env.SECRET?.trim();
  if (!secret) {
    throw new Error('Expected --secret, ADMIN_SECRET, or SECRET to contain the admin auth secret');
  }

  return await fetchAPI<T>(path, init, {
    baseURL: options.url,
    fetch: options.fetch,
    headers: {
      authorization: `Bearer ${secret}`,
      ...(init.body === undefined ? {} : { 'content-type': 'application/json' })
    }
  });
}

/** Validates and normalizes manager CLI arguments for an admin subject patch. */
export function parseAdminPatchArguments(
  provider: string,
  providerId: string,
  subject: string | number | undefined,
  detail = false
): {
  provider: ProviderType;
  providerId: string;
  patch: { subjectId?: number; detail?: true };
} {
  if (!SupportProviders.includes(provider as ProviderType)) {
    throw new Error(`Unsupported resource provider "${provider}"`);
  }

  const normalizedProviderId = providerId.trim();
  if (!normalizedProviderId) {
    throw new Error('Expected <provider-id> to be non-empty');
  }

  const hasSubjectId = subject !== undefined;
  const subjectId = hasSubjectId ? Number(subject) : undefined;
  if (hasSubjectId && (!Number.isInteger(subjectId) || subjectId! <= 0)) {
    throw new Error('Expected --subject to be a positive integer bgm id');
  }
  if (!hasSubjectId && !detail) {
    throw new Error('Expected --subject or --detail');
  }

  return {
    provider: provider as ProviderType,
    providerId: normalizedProviderId,
    patch: {
      ...(subjectId === undefined ? {} : { subjectId }),
      ...(detail ? { detail: true as const } : {})
    }
  };
}
