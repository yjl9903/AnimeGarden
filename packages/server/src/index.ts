import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

const app = new Hono({});

app.all('*', logger());
app.get('/', (c) => c.text('Hello Node.js!'));

serve(
  {
    fetch: app.fetch,
    port: process.env.port ? +process.env.port : 3000
  },
  (info) => {
    console.log(`Listening http://${info.address}:${info.port}`);
  }
);
