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
    feedUrl: `http://${hostname}/${sourceId}/feed`,
    siteUrl: source.url,
    imageUrl:
      source.type === 'playlist'
        ? `http://${hostname}${source.profileImageUrl}`
        : source.profileImageUrl,
  });

  videos.forEach((video) =>
    rssFeed.addItem({
      title: video.title,
      itunesTitle: video.title,
      description: video.description + '\n' + '\n' + video.url,
      date: new Date(video.date),
      enclosure: {
        url: `http://${hostname}/videos/${video.id}${
          quality != Quality.Default ? `?quality=${quality}` : ''
        }`,
        type: quality === Quality.Audio ? 'audio/aac' : 'video/mp4',
      },
      url: video.url,
      itunesDuration: video.duration,
    })
  );

  return rssFeed.buildXml();
};

export { getRssFeed };
