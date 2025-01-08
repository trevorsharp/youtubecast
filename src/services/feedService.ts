import { Podcast } from 'podcast';
import youtubeService from './youtubeService';
import queueService from './queueService';

const getFeedData = async (feedId: string) => {
  if (feedId.startsWith('UC')) {
    return await youtubeService.getChannel(feedId);
  }

  if (feedId.startsWith('PL') || feedId.startsWith('UU')) {
    return await youtubeService.getPlaylist(feedId);
  }

  return undefined;
};

const generatePodcastFeed = async (host: string, feedId: string) => {
  const feedData = await getFeedData(feedId);

  if (!feedData) return undefined;

  const [firstVideo] = feedData.videos;

  if (firstVideo) await queueService.addVideoToDownloadQueue(firstVideo.id);

  const rssFeed = new Podcast({
    title: feedData.name,
    description: feedData.description,
    author: feedData.name,
    feedUrl: `http://${host}/${feedId}/feed`,
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
        url: `http://${host}/videos/${video.id}`,
        type: 'video/mp4',
      },
      url: video.link,
      itunesDuration: video.duration,
    }),
  );

  return rssFeed.buildXml();
};

export default { getFeedData, generatePodcastFeed };
