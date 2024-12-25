import env from './env';
import router from './router';
import serveWithRange from './serveWithRange';
import configService from './services/configService';
import queueService from './services/queueService';

await configService.getConfig();

Bun.serve({
  port: 3000,
  fetch: async (request, server) => {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/videos/')) {
      const [_, videoId] = pathname.match(/^\/videos\/([^/]*)/) ?? ['', ''];

      if (videoId) {
        const videoFileExists = await Bun.file(`${env.CONTENT_FOLDER_PATH}/${videoId}.mp4`).exists();

        if (videoFileExists) {
          return Response.redirect(`/content/${videoId}.mp4`, 302);
        }
      }
    }

    if (pathname.startsWith('/content/')) {
      const rangeResponse = await serveWithRange(`.${pathname}`, request, server);
      if (rangeResponse) return rangeResponse;
    }

    return router.fetch(request, server);
  },
});

console.log('YouTubeCast server is up and running');

setInterval(() => queueService.downloadNextVideoInQueue(), 30 * 1000);
