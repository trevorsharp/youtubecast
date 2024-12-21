import { google, youtube_v3 } from 'googleapis';
import configService from './configService';
import channelValidator from '../validators/channelValidator';
import playlistValidator from '../validators/playlistValidator';
import { z } from 'zod';
import videoValidator from '../validators/videoValidator';
import getYoutubeLink from '../utils/getYoutubeLink';

let youtubeInstance: youtube_v3.Youtube | undefined = undefined;

const getYoutube = async () => {
  if (youtubeInstance) return youtubeInstance;

  const config = await configService.getConfig();
  youtubeInstance = google.youtube({ version: 'v3', auth: config.youtubeApiKey });
  return youtubeInstance;
};

const getChannel = async (channelId: string) => {
  const youtube = await getYoutube();

  const channelResult = await youtube.channels
    .list({ part: ['snippet'], id: [channelId] })
    .then((response) => response?.data?.items?.shift())
    .catch((error) => {
      console.error(error);
      return undefined;
    });

  if (!channelResult) return undefined;

  const { data: channel, error } = channelValidator.safeParse({
    type: 'channel',
    id: channelResult.id,
    name: channelResult.snippet?.title,
    description: channelResult.snippet?.description,
    imageUrl:
      channelResult.snippet?.thumbnails?.maxres?.url ??
      channelResult.snippet?.thumbnails?.high?.url ??
      channelResult.snippet?.thumbnails?.default?.url,
    link: `https://youtube.com/channel/${channelResult.id}`,
  });

  if (error) {
    console.error(error);
    return undefined;
  }

  const videos = await getVideosForChannel(channelId);

  return { ...channel, videos };
};

const getPlaylist = async (playlistId: string) => {
  const youtube = await getYoutube();

  const playlistResult = await youtube.playlists
    .list({ part: ['snippet'], id: [playlistId] })
    .then((response) => response?.data?.items?.shift())
    .catch((error) => {
      console.error(error);
      return undefined;
    });

  if (!playlistResult) return undefined;

  const channelId = playlistResult.snippet?.channelId;

  if (!channelId) return undefined;

  const channel = await getChannel(channelId);

  const playlistName = playlistId.startsWith('UU') ? `${channel?.name} (Members-Only)` : playlistResult.snippet?.title;

  const { data: playlist, error } = playlistValidator.safeParse({
    type: 'playlist',
    id: playlistResult.id,
    name: playlistName,
    description: playlistResult.snippet?.description,
    imageUrl: channel?.imageUrl,
    link: `https://youtube.com/playlist?list=${playlistResult.id}`,
  });

  if (error) {
    console.error(error);
    return undefined;
  }

  const videos = await getVideosForPlaylist(playlistId);

  return { ...playlist, videos };
};

const getVideosForChannel = async (channelId: string) => {
  const playlistId = channelId.replace(/^UC/, 'UU');
  return await getVideosForPlaylist(playlistId);
};

const getVideosForPlaylist = async (playlistId: string) => {
  const youtube = await getYoutube();

  const playlistItemsResult = await youtube.playlistItems
    .list({ part: ['snippet'], maxResults: 50, playlistId })
    .then((response) => response?.data?.items)
    .catch((error) => {
      console.error(error);
      return undefined;
    });

  if (!playlistItemsResult) return [];

  const playlistVideos = playlistItemsResult.map((item) => ({
    id: item.snippet?.resourceId?.videoId,
    publishedAt: item.snippet?.publishedAt,
  }));

  if (playlistVideos.length === 0) return [];

  const videoDetailsResult = await youtube.videos
    .list({ part: ['snippet,contentDetails,status'], maxResults: 50, id: playlistVideos.map((v) => v.id ?? '') })
    .then((response) => response?.data?.items)
    .catch((error) => {
      console.error(error);
      return undefined;
    });

  if (!videoDetailsResult) return [];

  const { data: videos, error } = z.array(videoValidator).safeParse(
    videoDetailsResult
      .filter(
        (video) =>
          video.status?.uploadStatus === 'processed' &&
          video.snippet?.liveBroadcastContent === 'none' &&
          video.status?.privacyStatus !== 'private' &&
          !isLikelyYouTubeShort(video),
      )
      .map((video) => ({
        id: video.id,
        title: video.snippet?.title,
        description: video.snippet?.description,
        duration: getDuration(video.contentDetails?.duration),
        date: getDate(video.snippet?.publishedAt, playlistVideos.find((v) => v.id === video.id)?.publishedAt),
        link: video.id ? getYoutubeLink(video.id) : '',
      })),
  );

  if (error) {
    console.error(error);
    return [];
  }

  videos.sort((a, b) => (a.date < b.date ? 1 : -1));

  return videos;
};

const isLikelyYouTubeShort = (video: youtube_v3.Schema$Video) => {
  const duration = getDuration(video.contentDetails?.duration);
  return duration < 120;
};

const getDuration = (duration: string | null | undefined) => {
  if (!duration) return 0;

  const getTimePart = (letter: 'H' | 'M' | 'S') =>
    parseInt(duration.match(new RegExp('[0-9]+(?=' + letter + ')'))?.shift() ?? '0');

  const hours = getTimePart('H');
  const minutes = getTimePart('M');
  const seconds = getTimePart('S');

  return hours * 3600 + minutes * 60 + seconds;
};

const getDate = (videoPublishedAt: string | null | undefined, playlistVideoPublishedAt: string | null | undefined) => {
  if (!videoPublishedAt) return undefined;

  const videoPublishedDate = new Date(videoPublishedAt);

  if (playlistVideoPublishedAt) {
    const playlistVideoPublishedDate = new Date(playlistVideoPublishedAt);

    if (playlistVideoPublishedDate > videoPublishedDate) {
      return playlistVideoPublishedDate.toISOString();
    }
  }

  return videoPublishedDate.toISOString();
};

export default { getChannel, getPlaylist };
