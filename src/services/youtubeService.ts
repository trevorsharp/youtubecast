import { google, youtube_v3 } from 'googleapis';
import configService from './configService';
import channelValidator from '../validators/channelValidator';
import playlistValidator from '../validators/playlistValidator';
import getYoutubeLink from '../utils/getYoutubeLink';

let youtubeInstance: youtube_v3.Youtube | undefined = undefined;

const logError = (error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
};

const getYoutube = async () => {
  if (youtubeInstance) return youtubeInstance;

  const config = await configService.getConfig();
  youtubeInstance = google.youtube({ version: 'v3', auth: config.youtubeApiKey });
  return youtubeInstance;
};

const getChannel = async (channelId: string, excludeVideos: boolean, maxItems?: number) => {
  const youtube = await getYoutube();

  const channelResult = await youtube.channels
    .list({ part: ['snippet'], id: [channelId] })
    .then((response) => response?.data?.items?.shift())
    .catch((error) => {
      logError(error);
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
    logError(error);
    return undefined;
  }

  const videos = excludeVideos ? [] : await getVideosForChannel(channelId, maxItems);

  return { ...channel, videos };
};

const getPlaylist = async (playlistId: string, excludeVideos: boolean, maxItems?: number) => {
  const youtube = await getYoutube();

  const playlistResult = await youtube.playlists
    .list({ part: ['snippet'], id: [playlistId] })
    .then((response) => response?.data?.items?.shift())
    .catch((error) => {
      logError(error);
      return undefined;
    });

  if (!playlistResult) return undefined;

  const channelId = playlistResult.snippet?.channelId;

  if (!channelId) return undefined;

  const channel = await getChannel(channelId, excludeVideos, maxItems);
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
    logError(error);
    return undefined;
  }

  const videos = excludeVideos ? [] : await getVideosForPlaylist(playlistId, maxItems);

  return { ...playlist, videos };
};

const getVideosForChannel = async (channelId: string, maxItems?: number) => {
  const playlistId = channelId.replace(/^UC/, 'UU');
  return await getVideosForPlaylist(playlistId, maxItems);
};

const getVideosForPlaylist = async (playlistId: string, maxItems?: number) => {
  const youtube = await getYoutube();
  const allPlaylistVideos: youtube_v3.Schema$PlaylistItem[] = [];
  let nextPageToken: string | undefined = undefined;

  do {
    // annotated because the pagination loop feeds nextPageToken back into the
    // request, which TS cannot infer without a circular reference
    const response: youtube_v3.Schema$PlaylistItemListResponse | undefined = await youtube.playlistItems
      .list({
        part: ['snippet'],
        maxResults: 50,
        playlistId,
        pageToken: nextPageToken,
      })
      .then((result) => result?.data)
      .catch((error) => {
        logError(error);
        return undefined;
      });

    if (!response?.items) break;

    allPlaylistVideos.push(...response.items);
    nextPageToken = response.nextPageToken ?? undefined;

    if (maxItems && allPlaylistVideos.length >= maxItems) {
      break;
    }
  } while (nextPageToken);

  if (allPlaylistVideos.length === 0) return [];

  const playlistVideos = allPlaylistVideos.map((item) => ({
    id: item.snippet?.resourceId?.videoId,
    publishedAt: item.snippet?.publishedAt,
  }));

  const videoIds = playlistVideos.map((v) => v.id ?? '').filter(Boolean);
  const finalVideos: {
    id: string;
    title: string;
    description: string;
    duration: number;
    date: string;
    link: string;
  }[] = [];

  // youtube.videos.list only accepts 50 IDs at a time
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const videoDetailsResult = await youtube.videos
      .list({ part: ['snippet,contentDetails,status'], id: chunk })
      .then((response) => response?.data?.items)
      .catch((error) => {
        logError(error);
        return undefined;
      });

    if (videoDetailsResult) {
      const config = await configService.getConfig();
      const parsedVideos = videoDetailsResult
        .filter((video) => shouldIncludeVideoInFeed(video, config))
        .map((video) => ({
          id: video.id ?? '',
          title: video.snippet?.title ?? '',
          description: video.snippet?.description ?? '',
          duration: getDuration(video.contentDetails?.duration),
          date: getDate(video.snippet?.publishedAt, playlistVideos.find((v) => v.id === video.id)?.publishedAt) ?? '',
          link: video.id ? getYoutubeLink(video.id) : '',
        }));
      finalVideos.push(...parsedVideos);
    }
  }

  finalVideos.sort((a, b) => ((a.date ?? '') < (b.date ?? '') ? 1 : -1));

  return maxItems ? finalVideos.slice(0, maxItems) : finalVideos;
};

const shouldIncludeVideoInFeed = (video: youtube_v3.Schema$Video, config: { minimumVideoDuration: number }) => {
  return (
    video.status?.uploadStatus === 'processed' &&
    video.snippet?.liveBroadcastContent === 'none' &&
    video.status?.privacyStatus !== 'private' &&
    getDuration(video.contentDetails?.duration) >= config.minimumVideoDuration
  );
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

  if (!playlistVideoPublishedAt) {
    return videoPublishedDate.toISOString();
  }

  const playlistVideoPublishedDate = new Date(playlistVideoPublishedAt);

  return playlistVideoPublishedDate > videoPublishedDate
    ? playlistVideoPublishedDate.toISOString()
    : videoPublishedDate.toISOString();
};

export default { getChannel, getPlaylist };
