import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import feedService from './services/feedService';
import videoService from './services/videoService';
import env from './env';
import queueService from './services/queueService';
import searchService from './services/searchService';

const router = new Hono();
router.get('/', serveStatic({ path: `${env.UI_FOLDER_PATH}/index.html` }));
router.get('/favicon.ico', serveStatic({ path: `${env.UI_FOLDER_PATH}/favicon.ico` }));
router.get('/robots.txt', serveStatic({ path: `${env.UI_FOLDER_PATH}/robots.txt` }));
router.get('/assets/*', serveStatic({ root: `${env.UI_FOLDER_PATH}` }));

router.get('/api/search/:searchText', async (context) => {
  const { searchText } = context.req.param();

  const searchResult = await searchService.searchChannels(searchText);

  if (!searchResult) {
    return context.text('Server Error - Could not find channel or playlist', 500);
  }

  const excludeVideos = true;
  const feedData = await feedService.getFeedData(searchResult, excludeVideos);

  return context.json(feedData);
});

router.get('/:feedId/feed', async (context) => {
  const { feedId } = context.req.param();
  const host = context.req.header('host') ?? '';
  const isHttps = context.req.header('x-forwarded-proto') === 'https';
  const baseUrl = `${isHttps ? 'https' : 'http'}://${host}`;
  const searchParams = new URL(context.req.url).searchParams;
  const isAudioOnly = searchParams.get('audioOnly') !== null && searchParams.get('audioOnly') !== 'false';

  const podcastFeed = await feedService.generatePodcastFeed(baseUrl, feedId, isAudioOnly);

  if (!podcastFeed) {
    return context.text('Server Error - Could not generate podcast feed', 500);
  }

  return context.text(podcastFeed, 200, { 'Content-Type': 'application/rss+xml' });
});

router.get('/videos/:videoId', async (context) => {
  const videoIdParam = context.req.param('videoId');
  const isHls = /\.m3u8$/i.test(videoIdParam);
  const videoId = videoIdParam.replace(/\.(m3u8|mp4)$/i, '');
  const searchParams = new URL(context.req.url).searchParams;
  const isAudioOnly = searchParams.get('audioOnly') !== null && searchParams.get('audioOnly') !== 'false';

  const videoUrl = await videoService.getVideoUrl(videoId, isAudioOnly, isHls);

  if (!isAudioOnly && !videoUrl?.startsWith('/content')) {
    await queueService.addVideoToDownloadQueue(videoId, { addToFrontOfQueue: true, ignoreQuality: true });
  }

  if (!videoUrl) {
    return context.text('Video is not available yet', 503, { 'Retry-After': '60' });
  }

  return context.redirect(videoUrl, 302);
});

router.get('/*', serveStatic({ path: `${env.UI_FOLDER_PATH}/index.html` }));

export default router;
