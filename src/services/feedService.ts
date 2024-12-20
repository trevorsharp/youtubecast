import { Podcast } from 'podcast';
import youtubeService from './youtubeService';

const getFeedData = async (feedId: string) => {
  if (feedId.startsWith('UC')) {
    return await youtubeService.getChannel(feedId);
  }

  if (feedId.startsWith('PL') || feedId.startsWith('UU')) {
    return await youtubeService.getPlaylist(feedId);
  }

  return undefined;
};

const generatePodcastFeed = async (host: string, feedId: string, isAudioOnly: boolean) => {
  const feedData = await getFeedData(feedId);

  if (!feedData) {
    return undefined;
  }

  const rssFeed = new Podcast({
    title: feedData.name,
    description: feedData.description,
    author: feedData.name,
    feedUrl: `http://${host}/${feedId}/feed${getUrlParams(isAudioOnly)}`,
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
        url: `http://${host}/videos/${video.id}${getUrlParams(isAudioOnly)}`,
        type: getContentType(isAudioOnly),
      },
      url: video.link,
      itunesDuration: video.duration,
    }),
  );

  return rssFeed.buildXml();
};

const getUrlParams = (isVideoOnly: boolean) => {
  if (isVideoOnly) return '?videoOnly';
  return '';
};

const getContentType = (isVideoOnly: boolean) => {
  if (isVideoOnly) return 'audio/aac';
  return 'video/mp4';
};

export default { getFeedData, generatePodcastFeed };
