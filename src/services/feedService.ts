import { Podcast } from 'podcast';
import { Quality } from '../types';
import { getSourceData, getVideos } from './sourceService';

const getRssFeed = async (
  sourceId: string,
  hostname: string,
  quality: Quality
): Promise<string> => {
  const source = await getSourceData(sourceId);
  const videos = await getVideos(source.id);

  const rssFeed = new Podcast({
    title: source.displayName,
    description: source.description,
    author: source.displayName,
    feedUrl: `http://${hostname}/feed/${sourceId}`,
    siteUrl:
      source.type === 'channel'
        ? `https://youtube.com/channel/${sourceId}`
        : `https://youtube.com/playlist?list=${sourceId}`,
    imageUrl: source.profileImageUrl,
  });

  videos.forEach((video) => {
    const itunesDuration = video.duration;

    rssFeed.addItem({
      title: video.title,
      itunesTitle: video.title,
      description: video.url,
      date: new Date(video.date),
      enclosure: {
        url: `http://${hostname}/watch?v=${video.id}${
          quality != Quality.Default ? `?quality=${quality}` : ''
        }`,
        type: quality === Quality.Audio ? 'audio/aac' : 'video/mp4',
      },
      url: video.url,
      itunesDuration,
    });
  });

  return rssFeed.buildXml();
};

export { getRssFeed };
