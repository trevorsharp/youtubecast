import router from './router';
import startupService from './services/startupService';

await startupService.startApplication();

Bun.serve({
  port: 3001,
  fetch: router.fetch,
  idleTimeout: 120
});

console.log('YouTubeCast server is up and running');
