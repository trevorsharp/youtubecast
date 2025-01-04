import router from './router';
import configService from './services/configService';
import queueService from './services/queueService';

await configService.getConfig();

Bun.serve({
  port: 3001,
  fetch: router.fetch,
});

console.log('YouTubeCast server is up and running');

setInterval(() => queueService.downloadNextVideoInQueue(), 2000);
