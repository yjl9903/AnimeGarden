export interface Env extends Record<string, unknown> {
  DATABASE_URL: string;

  animegarden: KVNamespace;

  database: D1Database;
}
