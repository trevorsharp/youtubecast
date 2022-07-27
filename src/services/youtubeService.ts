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
      id: ['PLxA687tYuMWjuNRTGvDuLQZjHaLQv3wYL'],
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

const getPlaylistIdForChannelUploads = async (channelId: string): Promise<string> => {
  const channelResult = await youtube.channels
    .list({
      part: ['contentDetails'],
      id: [channelId],
    })
    .then((response: any) => response?.data?.items?.shift()?.contentDetails)
    .catch(() => {});

  const validationResult = z
    .object({
      relatedPlaylists: z.object({
        uploads: z.string(),
      }),
    })
    .safeParse(channelResult);

  if (!validationResult.success)
    throw `Could not find uploads playlist for YouTube channel with id ${channelId}`;

  return validationResult.data.relatedPlaylists.uploads;
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

  return validationResult.data.map((result) => ({
    id: result.resourceId.videoId,
    title: result.title,
    date: result.publishedAt,
    description: result.description,
    url: `https://youtu.be/${result.resourceId.videoId}`,
  }));
};

export {
  searchForChannel,
  getChannelDetails,
  getPlaylistDetails,
  getPlaylistIdForChannelUploads,
  getVideosForPlaylist,
};
