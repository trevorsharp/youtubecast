import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import feedService from './services/feedService';
import videoService from './services/videoService';
import env from './env';
import queueService from './services/queueService';
import searchService from './services/searchService';

const router = new Hono();
router.get('/', serveStatic({ path: `${env.UI_FOLDER_PATH}/index.html` }));
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
  const { host } = new URL(context.req.url);
  const { feedId } = context.req.param();
  const { audioOnly } = context.req.query();
  const isAudioOnly = !!audioOnly && audioOnly !== 'false';

  const podcastFeed = await feedService.generatePodcastFeed(host, feedId, isAudioOnly);

  if (!podcastFeed) {
    return context.text('Server Error - Could not generate podcast feed', 500);
  }

  return context.text(podcastFeed, 200, { 'Content-Type': 'application/rss+xml' });
});

router.get('/videos/:videoId', async (context) => {
  const { videoId } = context.req.param();
  const { audioOnly } = context.req.query();
  const isAudioOnly = !!audioOnly && audioOnly !== 'false';

  const videoUrl = await videoService.getVideoUrl(videoId, isAudioOnly);

  if (!videoUrl) {
    return context.text('Server Error - Video could not be found', 500);
  }

  if (!isAudioOnly && !videoUrl.startsWith('/content')) {
    await queueService.addVideoToDownloadQueue(videoId, { addToFrontOfQueue: true });
  }

  return context.redirect(videoUrl, 302);
});

export default router;
