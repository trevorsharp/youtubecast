import NodeCache from 'node-cache';
import { Source, Video } from '../types';
import {
  searchForChannel,
  getChannelDetails,
  getPlaylistDetails,
  getVideosForPlaylist,
} from './youtubeService';

const cache = new NodeCache({ checkperiod: 120 });

const searchForSource = async (searchText: string): Promise<Source> => {
  searchText = searchText
    .trim()
    .replace(/http(s){0,1}:\/\//i, '')
    .replace(/.*youtube\.com/i, 'youtube.com')
    .replace(/youtube\.com\/channel\//i, '')
    .replace(/youtube\.com\/playlist\?list=/i, '');

  const cacheKey = `youtube-source-search-${searchText}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) return cacheResult as Source;

  const source = searchText.match(/^(UC[-_a-z0-9]{22}|PL[-_a-z0-9]{32})$/i)
    ? await getSourceData(searchText)
    : await searchForChannel(searchText);

  cache.set(cacheKey, source, 86400);
  return source;
};

const getSourceData = async (id: string): Promise<Source> => {
  const cacheKey = `youtube-source-${id}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) return cacheResult as Source;

  let source: Source | null = null;

  if (id.startsWith('UC')) source = await getChannelDetails(id);

  if (id.startsWith('PL')) source = await getPlaylistDetails(id);

  if (!source) throw `Could not find a YouTube source for id ${id}`;

  cache.set(cacheKey, source, 86400);
  return source;
};

const getVideos = async (sourceId: string): Promise<Video[]> => {
  const cacheKey = `youtube-source-videos-${sourceId}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) return cacheResult as Video[];

  let playlistId = sourceId;

  if (sourceId.startsWith('UC')) playlistId = sourceId.replace('UC', 'UU');

  const videos = await getVideosForPlaylist(playlistId);

  cache.set(cacheKey, videos, 600);
  return videos;
};

export { searchForSource, getSourceData, getVideos };
