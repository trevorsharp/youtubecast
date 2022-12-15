import { Podcast } from 'podcast';
import { Quality, Video } from '../types';
import { getSourceData, getVideos } from './sourceService';

const getRssFeed = async (
  sourceId: string,
  hostname: string,
  quality: Quality,
  excludeShorts: boolean,
  videoServer?: string | undefined
): Promise<string> => {
  const source = await getSourceData(sourceId);
  const videos = await getVideos(source.id);
  const videoQueryParams = new URLSearchParams();

  if (quality != Quality.Default) videoQueryParams.append('quality', quality.toString());

  if (videoServer) {
    notifyVideoServer(
      videoServer,
      videos.filter((video) => video.isAvailable)
    );
    videoQueryParams.append('videoServer', videoServer);
  }

  const rssFeed = new Podcast({
    title: source.displayName,
    description: source.description,
    author: source.displayName,
    feedUrl: `http://${hostname}/${sourceId}/feed`,
    siteUrl: source.url,
    imageUrl: source.profileImageUrl.startsWith('/')
      ? `http://${hostname}${source.profileImageUrl}`
      : source.profileImageUrl,
  });

  videos
    .filter((video) => video.isAvailable && !(excludeShorts && video.isYouTubeShort))
    .forEach((video) =>
      rssFeed.addItem({
        title: video.title,
        itunesTitle: video.title,
        description: video.description + '\n' + '\n' + video.url,
        date: new Date(video.date),
        enclosure: {
          url: `http://${hostname}/videos/${video.id}?${videoQueryParams.toString()}`,
          type: quality === Quality.Audio ? 'audio/aac' : 'video/mp4',
        },
        url: video.url,
        itunesDuration: video.duration,
      })
    );

  return rssFeed.buildXml();
};

const notifyVideoServer = async (videoServer: string, videoList: Video[]) =>
  await fetch(`http://${videoServer}`, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(videoList.map((x) => x.id)),
  }).catch((error) => console.log(error));

export { getRssFeed };
