export const KNOWN_ENV = {
  NODE_ENV: 'production',
  APP_HOST: 'animes.garden',
  FEED_HOST: 'api.animes.garden',
  WEB_SERVER_URL: 'https://api.animes.garden/',
  FEED_SERVER_URL: 'https://api.animes.garden/',
  KEEPSHARE_ID: 'gv78k1oi',
  UMAMI_HOST: 'umami.animes.garden',
  UMAMI_ID: 'bcff225d-6590-498e-9b39-3a5fc5c2b4d1'
};

export function env(ctx: Record<string, any> = process.env): typeof KNOWN_ENV {
  // @ts-ignore
  return Object.fromEntries(
    Object.entries(KNOWN_ENV).map(([key, value]) => [key, ctx?.[key] ?? value])
  );
}
