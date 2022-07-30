import NodeCache from 'node-cache';
import { Source, Video } from '../types';
import { searchChannels } from './searchService';
import { getChannelDetails, getPlaylistDetails, getVideosForPlaylist } from './youtubeService';

const cache = new NodeCache({ checkperiod: 120 });

const searchForSource = async (searchText: string): Promise<Source> => {
  searchText = searchText
    .trim()
    .replace(/http(s){0,1}:\/\//i, '')
    .replace(/.*youtube\.com/i, 'youtube.com')
    .replace(/youtube\.com\/channel\//i, '')
    .replace(/youtube\.com\/.*(\?|\&)list=([^\&]+)/i, '$1');

  const cacheKey = `source-search-${searchText}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) return cacheResult as Source;

  const sourceId = searchText.match(/^(UC[-_a-z0-9]{22}|PL[-_a-z0-9]{32})$/i)
    ? searchText
    : await searchChannels(searchText);

  if (!sourceId) throw `Could not find YouTube channel for ${searchText} 🤷`;

  const source = await getSourceData(sourceId);

  cache.set(cacheKey, source, 86400);
  return source;
};

const getSourceData = async (id: string): Promise<Source> => {
  const cacheKey = `source-${id}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) return cacheResult as Source;

  const source = id.startsWith('UC')
    ? await getChannelDetails(id)
    : id.startsWith('PL')
    ? await getPlaylistDetails(id)
    : null;

  if (!source) throw `Could not find a YouTube source for id ${id} 🤷`;

  cache.set(cacheKey, source, 86400);
  return source;
};

const getVideos = async (sourceId: string): Promise<Video[]> => {
  const cacheKey = `source-videos-${sourceId}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) return cacheResult as Video[];

  const playlistId = sourceId.replace('UC', sourceId.startsWith('UC') ? 'UU' : 'UC');

  const videos = await getVideosForPlaylist(playlistId);

  cache.set(cacheKey, videos, 900);
  return videos;
};

export { searchForSource, getSourceData, getVideos };
