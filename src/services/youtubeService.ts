import { google } from 'googleapis';
import { z } from 'zod';
import { Source, Video } from '../types';

const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });

const searchForChannel = async (searchText: string): Promise<Source> => {
  const searchResult = await youtube.search
    .list({
      part: ['snippet'],
      type: ['channel'],
      q: searchText,
      maxResults: 1,
    })
    .then((response: any) => response?.data?.items?.shift()?.snippet)
    .catch(() => {});

  const validationResult = z
    .object({
      channelId: z.string(),
      title: z.string(),
      description: z.string(),
      thumbnails: z.object({
        high: z.object({
          url: z.string(),
        }),
      }),
    })
    .safeParse(searchResult);

  if (!validationResult.success) throw `Could not find YouTube channel for ${searchText}`;

  return {
    type: 'channel',
    id: validationResult.data.channelId,
    displayName: validationResult.data.title,
    description: validationResult.data.description,
    profileImageUrl: validationResult.data.thumbnails.high.url,
    url: `https://youtube.com/channel/${validationResult.data.channelId}`,
  };
};

const getChannelDetails = async (channelId: string): Promise<Source> => {
  const channelResult = await youtube.channels
    .list({
      part: ['snippet'],
      id: [channelId],
    })
    .then((response: any) => response?.data?.items?.shift())
    .catch(() => {});

  const validationResult = z
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
    .safeParse(channelResult);

  if (!validationResult.success) throw `Could not find YouTube channel for id ${channelId}`;

  return {
    type: 'channel',
    id: validationResult.data.id,
    displayName: validationResult.data.snippet.title,
    description: validationResult.data.snippet.description,
    profileImageUrl: validationResult.data.snippet.thumbnails.high.url,
    url: `https://youtube.com/channel/${validationResult.data.id}`,
  };
};

const getPlaylistDetails = async (playlistId: string): Promise<Source> => {
  const playlistResult = await youtube.playlists
    .list({
      part: ['snippet'],
      id: [playlistId],
    })
    .then((response: any) => response?.data?.items?.shift())
    .catch(() => {});

  const validationResult = z
    .object({
      id: z.string(),
      snippet: z.object({
        title: z.string(),
        description: z.string(),
      }),
    })
    .safeParse(playlistResult);

  if (!validationResult.success) throw `Could not find YouTube playlist for id ${playlistId}`;

  return Promise.resolve({
    type: 'playlist',
    id: validationResult.data.id,
    displayName: validationResult.data.snippet.title,
    description: validationResult.data.snippet.description,
    profileImageUrl: '/playlist.png',
    url: `https://youtube.com/playlist?list=${validationResult.data.id}`,
  });
};

const getVideosForPlaylist = async (playlistId: string): Promise<Video[]> => {
  const videoResults = await youtube.playlistItems
    .list({
      part: ['snippet'],
      maxResults: 25,
      playlistId,
    })
    .then((response: any) => response?.data?.items?.map((x: any) => x?.snippet))
    .catch(() => {});

  const validationResult = z
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
    .safeParse(videoResults);

  if (!validationResult.success)
    throw `Could not find videos on YouTube playlist for id ${playlistId}`;

  const videos = validationResult.data.map((result) => ({
    id: result.resourceId.videoId,
    title: result.title,
    date: result.publishedAt,
    description: result.description,
    url: `https://youtu.be/${result.resourceId.videoId}`,
  }));

  const additionalDetails = await youtube.videos
    .list({
      part: ['snippet,contentDetails,status'],
      maxResults: 25,
      id: videos.map((x) => x.id),
    })
    .then((response: any) => response?.data?.items)
    .catch(() => {});

  const additionalValidationResult = z
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
    .safeParse(additionalDetails);

  if (!additionalValidationResult.success)
    throw `Could not find videos on YouTube playlist for id ${playlistId}`;

  return videos
    .map((video) => ({
      ...video,
      duration: getDuration(
        additionalValidationResult.data.find((videoDetails) => video.id === videoDetails.id)
          ?.contentDetails.duration
      ),
    }))
    .filter((video) => {
      const videoDetails = additionalValidationResult.data.find(
        (videoDetails) => video.id === videoDetails.id
      );

      if (!videoDetails) return false;

      return (
        videoDetails.status.uploadStatus === 'processed' &&
        videoDetails.snippet.liveBroadcastContent === 'none' &&
        videoDetails.status.privacyStatus !== 'private'
      );
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

export { searchForChannel, getChannelDetails, getPlaylistDetails, getVideosForPlaylist };
