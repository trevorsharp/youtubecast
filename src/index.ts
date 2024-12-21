import router from './router';
import configService from './services/configService';
import queueService from './services/queueService';

await configService.getConfig();

Bun.serve({
  port: 3000,
  fetch: async (request) => {
    const { pathname } = new URL(request.url);

    if (pathname.match(/^\/content\//i)) {
      const contentFile = Bun.file(`.${pathname}`);
      return new Response(contentFile);
    }

    return router.fetch(request);
  },
  error: () => {
    return new Response('Not Found', { status: 404 });
  },
});

console.log('YouTubeCast server is up and running');

setInterval(() => queueService.downloadNextVideoInQueue(), 30 * 1000);
