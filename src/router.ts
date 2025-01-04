import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import feedService from './services/feedService';
import videoService from './services/videoService';
import env from './env';
import queueService from './services/queueService';

const router = new Hono();
router.get('/', serveStatic({ path: `${env.UI_FOLDER_PATH}/index.html` }));
router.get('/assets/*', serveStatic({ root: `${env.UI_FOLDER_PATH}` }));

router.get('/:feedId/feed', async (context) => {
  const { host } = new URL(context.req.url);
  const { feedId } = context.req.param();

  const podcastFeed = await feedService.generatePodcastFeed(host, feedId);

  if (!podcastFeed) {
    return context.text('Server Error - Could not generate podcast feed', 500);
  }

  return context.text(podcastFeed, 200, { 'Content-Type': 'application/rss+xml' });
});

router.get('/videos/:videoId', async (context) => {
  const { videoId } = context.req.param();

  const videoUrl = await videoService.getVideoUrl(videoId);

  if (!videoUrl) {
    await queueService.addVideoToDownloadQueue(videoId);
    return context.text('Server Error - Video is not yet downloaded', 500);
  }

  return context.redirect(videoUrl, 302);
});

export default router;
