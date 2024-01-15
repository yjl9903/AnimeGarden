import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/', (c) => c.text('Hello Node.js!'));

serve(app, (info) => {
  console.log(`Listening http://${info.address}:${info.port}`);
});
