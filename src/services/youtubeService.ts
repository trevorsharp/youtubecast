import { createHash } from 'crypto';
import { google } from 'googleapis';
import { z } from 'zod';
import { env } from '~/env.mjs';
import cacheService from './cacheService';
import { getPlaylistVideoIds } from './playlistService';
import type { Source, Video } from '~/types';

const youtubeInstances =
  env.YOUTUBE_API_KEY.split(',').map((auth) => google.youtube({ version: 'v3', auth })) ?? [];

const getYoutube = () => {
  if (youtubeInstances.length === 0) throw 'No API Key Provided';
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return youtubeInstances[Math.floor((new Date().getMinutes() * youtubeInstances.length) / 60)]!;
};

const getChannelDetails = async (channelId: string) => {
  const rawChannelResult = await getYoutube()
    .channels.list({
      part: ['snippet'],
      id: [channelId],
    })
    .then((response) => response?.data?.items?.shift())
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
    .then((response) => response?.data?.items?.shift())
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
      console.log(error);
      return [undefined, undefined];
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

const getPlaylistItems = async (playlistId: string) => {
  const cacheKey = `youtube-playlist-items-${playlistId}`;
  const cacheResult = await cacheService.get<Awaited<ReturnType<typeof getPlaylistPage>>['items']>(
    cacheKey
  );

  const playlistItems = cacheResult ?? [];

  if (playlistItems.length === 0) {
    let playlistPage = await getPlaylistPage(playlistId);
    const newPlaylistItems = playlistPage.items;

    const playlistIsNotSortedByDateAdded = playlistItems.some(
      (item, index, arr) => index !== 0 && item.publishedAt >= (arr[index - 1]?.publishedAt ?? '')
    );

    if (env.ENABLE_PLAYLIST_SORTING && playlistIsNotSortedByDateAdded) {
      for (let i = 0; i < 100 && playlistPage.nextPageToken; i++) {
        playlistPage = await getPlaylistPage(playlistId, playlistPage.nextPageToken);
        newPlaylistItems.push(...playlistPage.items);
      }
    }

    playlistItems.push(
      ...newPlaylistItems.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)).splice(0, 50)
    );

    await cacheService.set(cacheKey, playlistItems, 1800);
  }

  return playlistItems.map((item) => ({
    id: item.resourceId.videoId,
    date: new Date(item.publishedAt).toISOString(),
  }));
};

const getVideosForPlaylist = async (playlistId: string) => {
  let playlistItems: { id: string; date: string }[] = [];
  let videoIds = (await getPlaylistVideoIds(playlistId)) ?? [];

  if (videoIds.length === 0 || env.ENABLE_PLAYLIST_SORTING) {
    playlistItems = await getPlaylistItems(playlistId);
    videoIds = playlistItems.map((item) => item.id);
  }

  if (videoIds.length === 0) return [];

  const videoIdHash = createHash('sha256').update(videoIds.sort().join('-')).digest('hex');

  const cacheKey = `youtube-videos-${videoIdHash}`;
  const cacheResult = await cacheService.get<Video[]>(cacheKey);
  if (cacheResult) return cacheResult;

  if (playlistItems.length === 0 && !playlistId.startsWith('UU')) {
    playlistItems = await getPlaylistItems(playlistId);
  }

  const rawVideoDetailsResults = await getYoutube()
    .videos.list({
      part: ['snippet,contentDetails,status'],
      maxResults: 50,
      id: videoIds,
    })
    .then((response) => response?.data?.items)
    .catch((error) => console.log(error));

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

  const videoDetails = await Promise.all(
    videoDetailsResults.data.map(async (rawVideo) => {
      const uploadDate = new Date(rawVideo.snippet.publishedAt).toISOString();
      const addedToPlaylistDate = playlistItems.find((v) => v.id === rawVideo.id)?.date;

      const date =
        addedToPlaylistDate && addedToPlaylistDate > uploadDate ? addedToPlaylistDate : uploadDate;

      const video: Video = {
        id: rawVideo.id,
        title: rawVideo.snippet.title,
        description: rawVideo.snippet.description,
        date,
        url: `https://youtu.be/${rawVideo.id}`,
        duration: getDuration(rawVideo.contentDetails.duration),
        isYouTubeShort: await getIsYouTubeShort(rawVideo.contentDetails.duration, rawVideo.id),
        isAvailable: getIsAvailable(
          rawVideo.status.uploadStatus,
          rawVideo.snippet.liveBroadcastContent,
          rawVideo.status.privacyStatus
        ),
      };

      return video;
    })
  );

  if (!videoDetails.some((video) => !video.isAvailable))
    await cacheService.set(cacheKey, videoDetails, 86400);

  return videoDetails;
};

const getIsAvailable = (
  uploadStatus: string,
  liveBroadcastContent: string,
  privacyStatus: string
) => uploadStatus === 'processed' && liveBroadcastContent === 'none' && privacyStatus !== 'private';

const getIsYouTubeShort = async (duration: string, videoId: string) =>
  getDuration(duration) <= 60 &&
  (await fetch(`https://www.youtube.com/shorts/${videoId}`, {
    method: 'HEAD',
  }).then((response) => !response.redirected));

const getDuration = (duration: string | undefined) => {
  if (!duration) return 0;

  const getTimePart = (letter: 'H' | 'M' | 'S') =>
    parseInt(duration.match(new RegExp('[0-9]+(?=' + letter + ')'))?.find(() => true) ?? '0');

  const hours = getTimePart('H');
  const minutes = getTimePart('M');
  const seconds = getTimePart('S');

  return hours * 3600 + minutes * 60 + seconds;
};

export { getChannelDetails, getPlaylistDetails, getPlaylistItems, getVideosForPlaylist };
