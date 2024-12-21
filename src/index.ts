import router from './router';
import configService from './services/configService';
import queueService from './services/queueService';
import getVideoFilePath from './utils/getVideoFilePath';

await configService.getConfig();

Bun.serve({
  port: 3000,
  fetch: async (request, server) => {
    const { pathname } = new URL(request.url);

    if (pathname.startsWith('/videos/')) {
      const [_, videoId] = pathname.match(/^\/videos\/([^/]*)/) ?? ['', ''];

      if (videoId) {
        const videoFilePath = getVideoFilePath(videoId);
        const videoFile = Bun.file(videoFilePath);

        const videoFileExists = await videoFile.exists();
        if (videoFileExists) {
          server.timeout(request, 600);
          return new Response(videoFile);
        }
      }
    }

    return router.fetch(request, server);
  },
});

console.log('YouTubeCast server is up and running');

setInterval(() => queueService.downloadNextVideoInQueue(), 30 * 1000);
