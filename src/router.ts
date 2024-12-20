import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import feedService from './services/feedService';
import videoService from './services/videoService';

const UI_FILE_PATH = './static';

const router = new Hono();
router.get('/', serveStatic({ path: `${UI_FILE_PATH}/index.html` }));
router.get('/assets/*', serveStatic({ root: `${UI_FILE_PATH}` }));
router.get('/content/*', serveStatic({ root: '.' }));

router.get('/:feedId/feed', async (context) => {
  const { host } = new URL(context.req.url);
  const { feedId } = context.req.param();
  const isAudioOnly = !!context.req.query('audioOnly');

  const podcastFeed = await feedService.generatePodcastFeed(host, feedId, isAudioOnly);

  if (!podcastFeed) {
    return context.text('Server Error - Could not generate podcast feed', 500);
  }

  return context.text(podcastFeed, 200, { 'Content-Type': 'application/rss+xml' });
});

router.get('/videos/:videoId', async (context) => {
  const { videoId } = context.req.param();
  const isAudioOnly = !!context.req.query('audioOnly');

  const videoUrl = await videoService.getVideoUrl(videoId, isAudioOnly);

  return context.redirect(videoUrl, 302);
});

export default router;
