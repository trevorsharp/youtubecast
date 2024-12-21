import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import feedService from './services/feedService';
import videoService from './services/videoService';
import env from './env';

const router = new Hono();
router.get('/', serveStatic({ path: `${env.UI_FOLDER_PATH}/index.html` }));
router.get('/assets/*', serveStatic({ root: `${env.UI_FOLDER_PATH}` }));
router.get('/content/*', serveStatic({ root: '.' }));

router.get('/:feedId/feed', async (context) => {
  const { host } = new URL(context.req.url);
  const { feedId } = context.req.param();
  const isAudioOnly = context.req.query('audioOnly') !== undefined;

  const podcastFeed = await feedService.generatePodcastFeed(host, feedId, isAudioOnly);

  if (!podcastFeed) {
    return context.text('Server Error - Could not generate podcast feed', 500);
  }

  return context.text(podcastFeed, 200, { 'Content-Type': 'application/rss+xml' });
});

router.get('/videos/:videoId', async (context) => {
  const { videoId } = context.req.param();
  const isAudioOnly = context.req.query('audioOnly') !== undefined;

  const videoUrl = await videoService.getVideoUrl(videoId, isAudioOnly);

  if (!videoUrl) {
    return context.text('Server Error - Could not get url for video', 500);
  }

  return context.redirect(videoUrl, 302);
});

export default router;
