import type { Context } from 'hono';

import { Feed } from 'feed';

import type { Env } from './types';

export function generateFeed(ctx: Context<{ Bindings: Env }>) {
  const feed = new Feed({
    title: '',
    id: '',
    copyright: ''
  });
  feed.addItem({
    title: '123',
    link: '123',
    date: new Date()
  });

  ctx.header('Content-Type', 'text/xml');
  ctx.body(feed.rss2());
}
