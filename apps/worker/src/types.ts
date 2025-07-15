export interface Env extends Record<string, unknown> {
  DATABASE_HOST: string;

  DATABASE_USERNAME: string;

  DATABASE_PASSWORD: string;

  animegarden: KVNamespace;

  database: D1Database;
}
