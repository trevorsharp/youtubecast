import { Podcast } from 'podcast';
import { Quality } from '~/types';
import getFeedUrlParams from '~/utils/getFeedUrlParams';
import { getSourceAndVideos } from './sourceService';

const getRssFeed = async (sourceId: string, host: string, quality: Quality) => {
  const [source, allVideos] = await getSourceAndVideos(sourceId);
  const videos = allVideos
    .filter((video) => video.isAvailable && !video.isYouTubeShort)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const videoQueryParams = new URLSearchParams();

  if (quality != Quality.Default) videoQueryParams.append('quality', quality.toString());

  const feedUrlParams = getFeedUrlParams(quality);

  const rssFeed = new Podcast({
    title: source.displayName,
    description: source.description,
    author: source.displayName,
    feedUrl: `http://${host}/${sourceId}/feed${feedUrlParams}`,
    siteUrl: source.url,
    imageUrl: source.profileImageUrl.startsWith('/')
      ? `http://${host}${source.profileImageUrl}`
      : source.profileImageUrl,
  });

  videos.forEach((video) =>
    rssFeed.addItem({
      title: video.title,
      itunesTitle: video.title,
      description: video.description + '\n' + '\n' + video.url,
      date: new Date(video.date),
      enclosure: {
        url: `http://${host}/videos/${video.id}${videoQueryParams.size > 0 ? '?' : ''}${videoQueryParams.toString()}`,
        type: quality === Quality.Audio ? 'audio/aac' : 'video/mp4',
      },
      url: video.url,
      itunesDuration: video.duration,
    }),
  );

  return rssFeed.buildXml();
};

export { getRssFeed };
