import { defineMiddleware } from 'astro:middleware';

import { bold, dim } from '@breadc/color';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const timer = createTimer();
  timer.start();
  const response = await next();
  timer.end();

  console.log(
    `${bold(context.request.method)} ${url.pathname} ${dim(timer.duration())}  <-- ${dim(`${context.request.referrer} ${context.clientAddress}`)}`
  );

  return response;
});

function createTimer() {
  let start = new Date();
  let end: Date | undefined = undefined;

  return {
    start() {
      start = new Date();
    },
    end() {
      end = new Date();
    },
    duration() {
      return `${((end.getTime() - start.getTime()) / 1000).toFixed(0)}ms`;
    }
  };
}
