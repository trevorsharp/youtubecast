import { google } from 'googleapis';
import { z } from 'zod';
import cacheService from './cacheService';
import { Source, Video } from '../types';

const youtubeInstances =
  process.env.YOUTUBE_API_KEY?.split(',').map((auth) => google.youtube({ version: 'v3', auth })) ??
  [];

const getYoutube = () => {
  if (youtubeInstances.length === 0) throw 'No API Key Provided';
  return youtubeInstances[Math.floor((new Date().getHours() * youtubeInstances.length) / 24)]!;
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
        title: z.string(),
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

  const displayName = playlistId.startsWith('UU')
    ? `${channelResult.data.snippet.title} (Members-Only)`
    : playlistResult.data.snippet.title;

  const profileImageUrl =
    channelResult.data.statistics.subscriberCount < 100
      ? '/playlist.png'
      : channelResult.data.snippet.thumbnails.high.url;

  return Promise.resolve({
    type: 'playlist',
    id: playlistResult.data.id,
    displayName,
    description: playlistResult.data.snippet.description,
    url: `https://youtube.com/playlist?list=${playlistResult.data.id}`,
    profileImageUrl,
  });
};

const getPlaylistPage = async (playlistId: string, pageToken?: string) => {
  const [rawPlaylistItemResults, rawPlaylistResults] = await getYoutube()
    .playlistItems.list({
      part: ['snippet'],
      maxResults: 50,
      playlistId,
      pageToken,
    })
    .then((response: any) => [response?.data?.items?.map((x: any) => x?.snippet), response?.data])
    .catch((error) => {
      console.log(error);
      return [];
    });

  const playlistItemResults = z
    .array(
      z.object({
        publishedAt: z.string(),
        resourceId: z.object({
          videoId: z.string(),
        }),
      })
    )
    .safeParse(rawPlaylistItemResults);

  const playlistResults = z
    .object({
      nextPageToken: z.string().nullish(),
      prevPageToken: z.string().nullish(),
      pageInfo: z.object({
        totalResults: z.number(),
      }),
    })
    .safeParse(rawPlaylistResults);

  if (!playlistItemResults.success || !playlistResults.success)
    throw `Could get playlist items for YouTube playlist with id ${playlistId} 🤷`;

  return { ...playlistResults.data, items: playlistItemResults.data };
};

const getVideoIdsForPlaylist = async (
  playlistId: string
): Promise<{ id: string; date: string }[]> => {
  const cacheKey = `youtube-video-in-playlist-${playlistId}`;
  const cacheResult = await cacheService.get<Awaited<ReturnType<typeof getPlaylistPage>>['items']>(
    cacheKey
  );

  let playlistItems = cacheResult ?? [];

  if (playlistItems.length === 0) {
    let playlistPage = await getPlaylistPage(playlistId);
    playlistItems = playlistPage.items;

    const playlistIsNotSortedByDateAdded = playlistItems.some(
      (item, index, arr) => index !== 0 && item.publishedAt >= arr[index - 1]!.publishedAt
    );

    if (playlistIsNotSortedByDateAdded) {
      for (let i = 0; i < 100 && playlistPage.nextPageToken; i++) {
        playlistPage = await getPlaylistPage(playlistId, playlistPage.nextPageToken);
        playlistItems = [...playlistItems, ...playlistPage.items];
      }
      playlistItems = playlistItems
        .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
        .splice(0, 50);
    }

    await cacheService.set(cacheKey, playlistItems, 1200);
  }

  return playlistItems.map((item) => ({
    id: item.resourceId.videoId,
    date: new Date(item.publishedAt).toISOString(),
  }));
};

const getVideoDetails = async (videos: { id: string; date?: string }[]): Promise<Video[]> => {
  if (videos.length === 0) return [];

  const cacheKey = `youtube-video-details-${videos
    .map((v) => v.id)
    .sort()
    .join('-')}`;
  const cacheResult = await cacheService.get<any>(cacheKey);

  const rawVideoDetailsResults =
    cacheResult ??
    (await getYoutube()
      .videos.list({
        part: ['snippet,contentDetails,status'],
        maxResults: 50,
        id: videos.map((v) => v.id),
      })
      .then(async (response: any) => {
        const results = response?.data?.items;
        await cacheService.set(cacheKey, results, 86400);
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
          title: z.string(),
          description: z.string(),
          publishedAt: z.string(),
          liveBroadcastContent: z.string(),
        }),
      })
    )
    .safeParse(rawVideoDetailsResults);

  if (!videoDetailsResults.success) throw `Could not find videos on YouTube 🤷`;

  return await Promise.all(
    videoDetailsResults.data
      .filter(async (videoDetails) => {
        const isVideoProcessed =
          videoDetails.status.uploadStatus === 'processed' &&
          videoDetails.snippet.liveBroadcastContent === 'none' &&
          videoDetails.status.privacyStatus !== 'private';

        if (!isVideoProcessed) await cacheService.del(cacheKey);

        return isVideoProcessed;
      })
      .map((videoDetails) => ({
        id: videoDetails.id,
        title: videoDetails.snippet.title,
        description: videoDetails.snippet.description,
        date:
          videos.find((v) => v.id === videoDetails.id)?.date ??
          new Date(videoDetails.snippet.publishedAt).toISOString(),
        url: `https://youtu.be/${videoDetails.id}`,
        duration: getDuration(videoDetails.contentDetails.duration),
      }))
      .map(async (video) => {
        const cacheKey = `youtube-video-is-youtube-short-${video.id}`;
        const cacheResult = await cacheService.get<boolean>(cacheKey);

        let isYouTubeShort = cacheResult ?? false;

        if (!cacheResult) {
          if (video.duration <= 60) {
            isYouTubeShort = await fetch(`https://www.youtube.com/shorts/${video.id}`, {
              method: 'HEAD',
            }).then((response) => !response.redirected);
          }

          await cacheService.set(cacheKey, isYouTubeShort, 86400);
        }

        return { ...video, isYouTubeShort };
      })
  );
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

export { getChannelDetails, getPlaylistDetails, getVideoIdsForPlaylist, getVideoDetails };
