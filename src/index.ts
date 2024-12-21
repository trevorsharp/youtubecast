import router from './router';
import configService from './services/configService';
import queueService from './services/queueService';

await configService.getConfig();

Bun.serve({
  port: 3000,
  fetch: router.fetch,
});

console.log('YouTubeCast server is up and running');

setInterval(() => queueService.downloadNextVideoInQueue(), 30 * 1000);
