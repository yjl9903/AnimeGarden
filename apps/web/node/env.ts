export const KNOWN_ENV = {
  NODE_ENV: 'production',
  KEEPSHARE: 'gv78k1oi',
  APP_HOST: 'animes.garden',
  FEED_HOST: 'api.animes.garden',
  SERVER_URL: 'https://api.animes.garden/',
  FEED_SERVER_URL: 'https://api.animes.garden/'
};

export function env(ctx: Record<string, any> = process.env): typeof KNOWN_ENV {
  // @ts-ignore
  return Object.fromEntries(
    Object.entries(KNOWN_ENV).map(([key, value]) => [key, ctx?.[key] ?? value])
  );
}
