import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

const app = new Hono();

app.all('*', logger());
app.get('/', (c) => c.text('Hello Node.js!'));

serve(app, (info) => {
  console.log(`Listening http://${info.address}:${info.port}`);
});
