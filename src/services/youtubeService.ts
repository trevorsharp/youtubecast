import { createHash } from 'crypto';
import { google } from 'googleapis';
import { z } from 'zod';
import { env } from '~/env';
import { withCache } from './cacheService';
import { getPlaylistVideoIds } from './playlistService';
import type { Source, Video } from '~/types';

const youtubeInstances =
  env.YOUTUBE_API_KEY?.split(',')?.map((auth) => google.youtube({ version: 'v3', auth })) ?? [];

const getYoutube = () => {
  if (youtubeInstances.length === 0) throw 'No API Key Provided';
  return youtubeInstances[Math.floor((new Date().getMinutes() * youtubeInstances.length) / 60)]!;
};

const getChannelDetails = async (channelId: string) => {
  const rawChannelResult = await getYoutube()
    .channels.list({
      part: ['snippet'],
      id: [channelId],
    })
    .then((response) => response?.data?.items?.shift())
    .catch((error) => console.error(error));

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

  const source: Source = {
    type: 'channel',
    id: channelResult.data.id,
    displayName: channelResult.data.snippet.title,
    description: channelResult.data.snippet.description,
    profileImageUrl: channelResult.data.snippet.thumbnails.high.url,
    url: `https://youtube.com/channel/${channelResult.data.id}`,
  };

  return source;
};

const getPlaylistDetails = async (playlistId: string) => {
  const rawPlaylistResult = await getYoutube()
    .playlists.list({
      part: ['snippet'],
      id: [playlistId],
    })
    .then((response) => response?.data?.items?.shift())
    .catch((error) => console.error(error));

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
    .then((response) => response?.data?.items?.shift())
    .catch((error) => console.error(error));

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

  const source: Source = {
    type: 'playlist',
    id: playlistResult.data.id,
    displayName,
    description: playlistResult.data.snippet.description,
    url: `https://youtube.com/playlist?list=${playlistResult.data.id}`,
    profileImageUrl,
  };

  return source;
};

const getVideosForPlaylist = async (playlistId: string) => {
  if (env.ENABLE_PLAYLIST_SORTING) return await fetchPlaylistVideos(playlistId);

  const videoIds = await getPlaylistVideoIds(playlistId);

  if (videoIds.length === 0) return await fetchPlaylistVideos(playlistId);

  return getVideoDetails(videoIds.map((videoId) => ({ id: videoId })));
};

const fetchPlaylistVideos = async (playlistId: string): Promise<Video[]> => {
  const firstPlaylistPage = await getPlaylistPage(playlistId);
  const playlistItems = firstPlaylistPage.items;

  if (env.ENABLE_PLAYLIST_SORTING) {
    const playlistIsNotSortedByDateAdded = playlistItems.some(
      (item, index, arr) => index !== 0 && item.publishedAt >= (arr[index - 1]?.publishedAt ?? ''),
    );

    if (playlistIsNotSortedByDateAdded) {
      let nextPageToken = firstPlaylistPage.nextPageToken;
      for (let i = 0; i < 100 && nextPageToken; i++) {
        const nextPlaylistPage = await getPlaylistPage(playlistId, nextPageToken);
        playlistItems.push(...nextPlaylistPage.items);
        nextPageToken = nextPlaylistPage.nextPageToken;
      }
    }
  }

  const videos = playlistItems
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .splice(0, 50)
    .map((item) => ({
      id: item.resourceId.videoId,
      date: new Date(item.publishedAt),
    }));

  if (videos.length === 0) return [];

  return await getVideoDetails(videos);
};

const getPlaylistPage = async (playlistId: string, pageToken?: string) => {
  const [rawPlaylistItemResults, rawPlaylistResults] = await getYoutube()
    .playlistItems.list({
      part: ['snippet'],
      maxResults: 50,
      playlistId,
      pageToken,
    })
    .then((response) => [response?.data?.items?.map((x) => x?.snippet), response?.data])
    .catch((error) => {
      if (typeof error === 'object' && (error as { code: unknown }).code === 404)
        return [[], { pageInfo: { totalResults: 0 } }];
      console.error(error);
      return [undefined, undefined];
    });

  const playlistItemResults = z
    .array(
      z.object({
        publishedAt: z.string(),
        resourceId: z.object({
          videoId: z.string(),
        }),
      }),
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

const getVideoDetails = (videos: { id: string; date?: Date | undefined }[]): Promise<Video[]> => {
  const videoIdHash = createHash('sha256')
    .update(
      videos
        .map((v) => v.id)
        .sort()
        .join('-'),
    )
    .digest('hex');

  return withCache({ cacheKey: `video-details-${videoIdHash}`, ttl: 24 * 60 * 60 }, async () => {
    const rawVideoDetailsResults = await getYoutube()
      .videos.list({
        part: ['snippet,contentDetails,status'],
        maxResults: 50,
        id: videos.map((v) => v.id),
      })
      .then((response) => response?.data?.items)
      .catch((error) => console.error(error));

    const videoDetailsResults = z
      .array(
        z.object({
          id: z.string(),
          contentDetails: z.object({
            duration: z.string().optional(),
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
        }),
      )
      .safeParse(rawVideoDetailsResults);

    if (!videoDetailsResults.success) throw `Could not find videos on YouTube 🤷`;

    const videoDetails = await Promise.all(
      videoDetailsResults.data.map(async (rawVideo) => ({
        id: rawVideo.id,
        title: rawVideo.snippet.title,
        description: rawVideo.snippet.description,
        date: getDate(rawVideo.snippet.publishedAt, videos.find((v) => v.id === rawVideo.id)?.date),
        url: `https://youtu.be/${rawVideo.id}`,
        duration: getDuration(rawVideo.contentDetails.duration),
        isYouTubeShort: await getIsYouTubeShort(rawVideo.contentDetails.duration, rawVideo.id),
        isAvailable: getIsAvailable(
          rawVideo.status.uploadStatus,
          rawVideo.snippet.liveBroadcastContent,
          rawVideo.status.privacyStatus,
        ),
      })),
    );

    return videoDetails;
  })();
};

const getDate = (uploadDate: Date | string, addedToPlaylistDate: Date | string | undefined) =>
  (addedToPlaylistDate && new Date(addedToPlaylistDate) > new Date(uploadDate)
    ? new Date(addedToPlaylistDate)
    : new Date(uploadDate)
  ).toISOString();

const getDuration = (duration: string | undefined) => {
  if (!duration) return 0;

  const getTimePart = (letter: 'H' | 'M' | 'S') =>
    parseInt(duration.match(new RegExp('[0-9]+(?=' + letter + ')'))?.find(() => true) ?? '0');

  const hours = getTimePart('H');
  const minutes = getTimePart('M');
  const seconds = getTimePart('S');

  return hours * 3600 + minutes * 60 + seconds;
};

const getIsAvailable = (
  uploadStatus: string,
  liveBroadcastContent: string,
  privacyStatus: string,
) => uploadStatus === 'processed' && liveBroadcastContent === 'none' && privacyStatus !== 'private';

const getIsYouTubeShort = async (duration: string | undefined, videoId: string) =>
  !!duration &&
  getDuration(duration) <= 60 &&
  (await fetch(`https://www.youtube.com/shorts/${videoId}`, {
    method: 'HEAD',
  }).then((response) => !response.redirected));

export { getChannelDetails, getPlaylistDetails, getVideosForPlaylist };
