import { Hono } from 'hono';
import { remix } from 'remix-hono/handler';
import { logDevReady } from '@remix-run/cloudflare';
import { staticAssets } from 'remix-hono/cloudflare';

// @ts-ignore
import * as build from './build/server';

if (process.env.NODE_ENV === 'development') logDevReady(build as any);

type Bindings = {};

type Variables = {};

type ContextEnv = { Bindings: Bindings; Variables: Variables };

const app = new Hono<ContextEnv>();

app.use('*', staticAssets(), remix({ build: build as any }));

export default app;
