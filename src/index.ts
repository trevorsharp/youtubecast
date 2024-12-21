import router from './router';
import configService from './services/configService';

await configService.getConfig();

Bun.serve({
  port: 3000,
  fetch: router.fetch,
});

console.log('YouTubeCast server is up and running');
