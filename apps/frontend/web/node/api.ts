import type { Handler, Env } from 'hono';

export const api = <E extends Env = any>(): Handler<E> => {
  return async (ctx) => {
    return ctx.json({ ok: false });
  };
};
