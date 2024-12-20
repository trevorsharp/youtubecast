import router from './router';

Bun.serve({
  port: 3000,
  fetch: router.fetch,
});

console.log('YouTubeCast server is up and running');
