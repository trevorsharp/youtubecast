import type { Source, Video } from '~/types';
import cacheService from './cacheService';
import { searchChannels } from './searchService';
import { getChannelDetails, getPlaylistDetails, getVideosForPlaylist } from './youtubeService';

const searchForSource = async (searchText: string) => {
  searchText = searchText
    .trim()
    .replace(/http(s){0,1}:\/\//i, '')
    .replace(/.*youtube\.com/i, 'youtube.com')
    .replace(/youtube\.com\/channel\//i, '')
    .replace(/youtube\.com\/.*(\?|\&)list=([^\&]+)/i, '$2');

  const sourceId = searchText.match(/^(UC[-_a-z0-9]{22}|PL[-_a-z0-9]{32}|UU[-_a-z0-9]{24})$/i)
    ? searchText
    : await searchChannels(searchText);

  if (!sourceId) throw `Could not find YouTube channel for ${searchText} 🤷`;

  const source = await getSourceData(sourceId);

  return source;
};

const getSourceData = async (id: string) => {
  const cacheKey = `source-${id}`;
  const cacheResult = await cacheService.get<Source>(cacheKey);
  if (cacheResult) return cacheResult;

  const source = id.startsWith('UC')
    ? await getChannelDetails(id)
    : id.startsWith('PL') || id.startsWith('UU')
    ? await getPlaylistDetails(id)
    : null;

  if (!source) throw `Could not find a YouTube source for id ${id} 🤷`;

  const cacheTtl = Math.floor(3 * (1 + Math.random()) * 86400);
  await cacheService.set(cacheKey, source, cacheTtl);
  return source;
};

const getVideos = async (sourceId: string) => {
  const cacheKey = `source-videos-${sourceId}`;
  const cacheResult = await cacheService.get<Video[]>(cacheKey);
  if (cacheResult) return cacheResult;

  const playlistId = sourceId.replace(/^UC/, 'UU');

  const videos = await getVideosForPlaylist(playlistId);

  await cacheService.set(cacheKey, videos, 1200);

  return videos;
};

export { searchForSource, getSourceData, getVideos };
