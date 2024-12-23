import { stat } from 'fs/promises';
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

          const fileSize = await stat(videoFilePath).then((stats) => stats.size);

          const rangeHeader = request.headers.get('range');

          if (rangeHeader) {
            const [startRange, endRange] = rangeHeader.replace('bytes=', '').split('-');

            const end = parseInt(endRange, 10) || fileSize - 1;
            const start = parseInt(startRange, 10) || 0;

            const contentLength = end - start + 1;

            if (start >= fileSize || end >= fileSize) {
              return new Response(null, {
                status: 416,
                headers: {
                  'Content-Range': `bytes */${fileSize}`,
                },
              });
            }

            return new Response(videoFile.slice(start, end), {
              status: 206,
              headers: {
                'Accept-Ranges': 'bytes',
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Content-Length': `${contentLength}`,
              },
            });
          }

          return new Response(videoFile, { headers: { 'Accept-Ranges': 'bytes' } });
        }
      }
    }

    return router.fetch(request, server);
  },
});

console.log('YouTubeCast server is up and running');

setInterval(() => queueService.downloadNextVideoInQueue(), 30 * 1000);
