import { google } from 'googleapis';
import NodeCache from 'node-cache';
import { z } from 'zod';
import { Source, Video } from '../types';

const cache = new NodeCache({ checkperiod: 120 });

const youtubeInstance = process.env.YOUTUBE_API_KEY
  ? google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY })
  : undefined;

const getYoutube = () => {
  if (!youtubeInstance) throw 'No API Key Provided';
  return youtubeInstance;
};

const getChannelDetails = async (channelId: string): Promise<Source> => {
  const rawChannelResult = await getYoutube()
    .channels.list({
      part: ['snippet'],
      id: [channelId],
    })
    .then((response: any) => response?.data?.items?.shift())
    .catch((error) => console.log(error));

  const channelResult = z
    .object({
      id: z.string(),
      snippet: z.object({
        title: z.string(),
        description: z.string(),
        thumbnails: z.object({
          high: z.object({
            url: z.string(),
          }),
        }),
      }),
    })
    .safeParse(rawChannelResult);

  if (!channelResult.success) throw `Could not find YouTube channel for id ${channelId} 🤷`;

  return {
    type: 'channel',
    id: channelResult.data.id,
    displayName: channelResult.data.snippet.title,
    description: channelResult.data.snippet.description,
    profileImageUrl: channelResult.data.snippet.thumbnails.high.url,
    url: `https://youtube.com/channel/${channelResult.data.id}`,
  };
};

const getPlaylistDetails = async (playlistId: string): Promise<Source> => {
  const rawPlaylistResult = await getYoutube()
    .playlists.list({
      part: ['snippet'],
      id: [playlistId],
    })
    .then((response: any) => response?.data?.items?.shift())
    .catch((error) => console.log(error));

  const playlistResult = z
    .object({
      id: z.string(),
      snippet: z.object({
        title: z.string(),
        description: z.string(),
        channelId: z.string(),
      }),
    })
    .safeParse(rawPlaylistResult);

  if (!playlistResult.success) throw `Could not find YouTube playlist for id ${playlistId} 🤷`;

  const channelId = playlistResult.data.snippet.channelId;

  const rawChannelResult = await getYoutube()
    .channels.list({
      part: ['snippet', 'statistics'],
      id: [channelId],
    })
    .then((response: any) => response?.data?.items?.shift())
    .catch((error) => console.log(error));

  const channelResult = z
    .object({
      snippet: z.object({
        thumbnails: z.object({
          high: z.object({
            url: z.string(),
          }),
        }),
      }),
      statistics: z.object({
        subscriberCount: z
          .string()
          .regex(/^[0-9]+$/)
          .transform((x) => parseInt(x)),
      }),
    })
    .safeParse(rawChannelResult);

  if (!channelResult.success) throw `Could not find YouTube channel for id ${channelId} 🤷`;

  return Promise.resolve({
    type: 'playlist',
    id: playlistResult.data.id,
    displayName: playlistResult.data.snippet.title,
    description: playlistResult.data.snippet.description,
    url: `https://youtube.com/playlist?list=${playlistResult.data.id}`,
    profileImageUrl:
      channelResult.data.statistics.subscriberCount < 100
        ? '/playlist.png'
        : channelResult.data.snippet.thumbnails.high.url,
  });
};

const getVideosForPlaylist = async (playlistId: string): Promise<Video[]> => {
  const rawPlaylistItemResults = await getYoutube()
    .playlistItems.list({
      part: ['snippet'],
      maxResults: 50,
      playlistId,
    })
    .then((response: any) => response?.data?.items?.map((x: any) => x?.snippet))
    .catch((error) => console.log(error));

  const playlistItemResults = z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        publishedAt: z.string(),
        resourceId: z.object({
          videoId: z.string(),
        }),
      })
    )
    .safeParse(rawPlaylistItemResults);

  if (!playlistItemResults.success)
    throw `Could not find videos on YouTube playlist for id ${playlistId} 🤷`;

  const videos = playlistItemResults.data.map((result) => ({
    id: result.resourceId.videoId,
    title: result.title,
    date: result.publishedAt,
    description: result.description,
    url: `https://youtu.be/${result.resourceId.videoId}`,
  }));

  const cacheKey = `youtube-video-details-${videos
    .map((x) => x.id)
    .sort((a, b) => (a < b ? -1 : 1))
    .join('-')}`;
  const cacheResult = cache.get<any>(cacheKey);

  const rawVideoDetailsResults =
    cacheResult ??
    (await getYoutube()
      .videos.list({
        part: ['snippet,contentDetails,status'],
        maxResults: 50,
        id: videos.map((x) => x.id),
      })
      .then((response: any) => {
        const results = response?.data?.items;
        cache.set(cacheKey, results, 86400);
        return results;
      })
      .catch((error) => console.log(error)));

  const videoDetailsResults = z
    .array(
      z.object({
        id: z.string(),
        contentDetails: z.object({
          duration: z.string(),
        }),
        status: z.object({
          uploadStatus: z.string(),
          privacyStatus: z.string(),
        }),
        snippet: z.object({
          liveBroadcastContent: z.string(),
        }),
      })
    )
    .safeParse(rawVideoDetailsResults);

  if (!videoDetailsResults.success)
    throw `Could not find videos on YouTube playlist for id ${playlistId} 🤷`;

  return videos
    .map((video) => ({
      ...video,
      duration: getDuration(
        videoDetailsResults.data.find((videoDetails) => video.id === videoDetails.id)
          ?.contentDetails.duration
      ),
    }))
    .filter((video) => {
      const videoDetails = videoDetailsResults.data.find(
        (videoDetails) => video.id === videoDetails.id
      );

      const isVideoProcessed =
        videoDetails?.status.uploadStatus === 'processed' &&
        videoDetails?.snippet.liveBroadcastContent === 'none' &&
        videoDetails?.status.privacyStatus !== 'private';

      if (!isVideoProcessed) cache.del(cacheKey);

      return isVideoProcessed;
    });
};

const getDuration = (duration: string | undefined): number => {
  if (!duration) return 0;

  const getTimePart = (letter: 'H' | 'M' | 'S') =>
    parseInt(duration.match(new RegExp('[0-9]+(?=' + letter + ')'))?.find(() => true) ?? '0');

  const hours = getTimePart('H');
  const minutes = getTimePart('M');
  const seconds = getTimePart('S');

  return hours * 3600 + minutes * 60 + seconds;
};

export { getChannelDetails, getPlaylistDetails, getVideosForPlaylist };
