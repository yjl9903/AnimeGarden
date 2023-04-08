import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return new Response('hello');
  }
};
