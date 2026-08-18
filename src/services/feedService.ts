import { Podcast } from 'podcast';
import youtubeService from './youtubeService';
import queueService from './queueService';
import cacheService from './cacheService';
import configService from './configService';

const getFeedData = cacheService.withCache(
  { cacheKey: 'feed-data' },
  async (feedId: string, excludeVideos: boolean = false) => {
    if (feedId.startsWith('UC')) {
      return await youtubeService.getChannel(feedId, excludeVideos);
    }

    if (feedId.startsWith('PL') || feedId.startsWith('UU')) {
      return await youtubeService.getPlaylist(feedId, excludeVideos);
    }

    return undefined;
  },
);

const generatePodcastFeed = async (baseUrl: string, feedId: string, isAudioOnly: boolean) => {
  const feedData = await getFeedData(feedId);

  if (!feedData) return undefined;

  const config = await configService.getConfig();
  const videoExtension = config.maximumCompatibility ? '.mp4' : '.m3u8';

  if (!isAudioOnly) {
    const [firstVideo] = feedData.videos;
    if (firstVideo) await queueService.addVideoToDownloadQueue(firstVideo.id);
  }

  const rssFeed = new Podcast({
    title: feedData.name,
    description: feedData.description,
    author: feedData.name,
    feedUrl: `${baseUrl}/${feedId}/feed${getQueryParams(isAudioOnly)}`,
    siteUrl: feedData.link,
    imageUrl: feedData.imageUrl,
  });

  feedData.videos.forEach((video) =>
    rssFeed.addItem({
      title: video.title,
      itunesTitle: video.title,
      description: `${video.description}\n\n${video.link}`,
      date: new Date(video.date),
      enclosure: {
        url: `${baseUrl}/videos/${video.id}${isAudioOnly ? '' : videoExtension}${getQueryParams(isAudioOnly)}`,
        type: isAudioOnly ? 'audio/mp3' : 'video/mp4',
      },
      url: video.link,
      itunesDuration: video.duration,
    }),
  );

  return rssFeed.buildXml();
};

const getQueryParams = (isAudioOnly: boolean) => {
  if (isAudioOnly) return '?audioOnly';
  return '';
};

export default { getFeedData, generatePodcastFeed };
