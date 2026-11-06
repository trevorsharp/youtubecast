import { Podcast } from 'podcast';
import youtubeService from './youtubeService';
import queueService from './queueService';
import cacheService from './cacheService';
import configService from './configService';

const getFeedData = cacheService.withCache(
  { cacheKey: 'feed-data' },
  async (feedId: string, excludeVideos: boolean = false, maxItems?: number) => {
    if (feedId.startsWith('UC')) {
      return await youtubeService.getChannel(feedId, excludeVideos, maxItems);
    }

    if (feedId.startsWith('PL') || feedId.startsWith('UU')) {
      return await youtubeService.getPlaylist(feedId, excludeVideos, maxItems);
    }

    return undefined;
  },
);

const generatePodcastFeed = async (baseUrl: string, feedId: string, isAudioOnly: boolean, maxItems?: number) => {
  const feedData = await getFeedData(feedId, isAudioOnly ? false : undefined, maxItems);

  if (!feedData) return undefined;

  const config = await configService.getConfig();

  const feedMaxItems =
    maxItems !== undefined && !Number.isNaN(maxItems) && maxItems >= 1 && maxItems <= 5000
      ? maxItems
      : typeof config.maxItems === 'number' && config.maxItems >= 1 && config.maxItems <= 5000
        ? config.maxItems
        : undefined;

  if (!isAudioOnly) {
    const [firstVideo] = feedData.videos.slice(0, feedMaxItems ?? undefined);
    if (firstVideo) await queueService.addVideoToDownloadQueue(firstVideo.id);
  }

  const rssFeed = new Podcast({
    title: feedData.name,
    description: feedData.description,
    author: feedData.name,
    feedUrl: `${baseUrl}/${feedId}/feed${getQueryParams(isAudioOnly, feedMaxItems)}`,
    siteUrl: feedData.link,
    imageUrl: feedData.imageUrl,
  });

  feedData.videos.slice(0, feedMaxItems).forEach((video) =>
    rssFeed.addItem({
      title: video.title,
      itunesTitle: video.title,
      description: `${video.description}\n\n${video.link}`,
      date: new Date(video.date),
      enclosure: {
        url: `${baseUrl}/videos/${video.id}${getQueryParams(isAudioOnly)}`,
        type: isAudioOnly ? 'audio/mp4' : 'video/mp4',
      },
      customElements:
        isAudioOnly || config.maximumCompatibility
          ? []
          : [
              {
                'podcast:alternateEnclosure': [
                  { _attr: { type: 'application/x-mpegURL', length: 0 } },
                  { 'podcast:source': { _attr: { uri: `${baseUrl}/videos/${video.id}.m3u8` } } },
                ],
              },
            ],
      url: video.link,
      itunesDuration: video.duration,
    }),
  );

  return rssFeed.buildXml();
};

const getQueryParams = (isAudioOnly: boolean, maxItems?: number) => {
  const params = [];
  if (isAudioOnly) params.push('audioOnly');
  if (maxItems !== undefined) params.push(`maxItems=${maxItems}`);
  if (params.length === 0) return '';
  return `?${params.join('&')}`;
};

export default { getFeedData, generatePodcastFeed };
