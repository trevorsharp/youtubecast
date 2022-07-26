import NodeCache from 'node-cache';
import { Source, Video } from '../types';
import {
  searchForChannel,
  getChannelDetails,
  getPlaylistDetails,
  getPlaylistIdForChannelUploads,
  getVideosForPlaylist,
} from './youtubeService';

const cache = new NodeCache({ checkperiod: 120 });

const searchForSource = async (searchText: string): Promise<Source> => {
  searchText = searchText.trim();

  const cacheKey = `youtube-source-search-${searchText}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) return cacheResult as Source;

  const id = searchText.match(/^(UC|PL)[A-Z0-9]*$/i)
    ? searchText
    : await searchForChannel(searchText);

  if (!id) throw `Could not find a channel for '${searchText}'`;

  const source = await getSourceData(id);

  cache.set(cacheKey, source, 86400);
  return source;
};

const getSourceData = async (id: string): Promise<Source> => {
  const cacheKey = `youtube-source-${id}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) return cacheResult as Source;

  let source: Source | null = null;

  if (id.startsWith('UC')) {
    source = await getChannelDetails(id);
    if (!source) throw `Could not find channel with id ${id}`;
  }

  if (id.startsWith('PL')) {
    source = await getPlaylistDetails(id);
    if (!source) throw `Could not find playlist with id ${id}`;
  }

  if (!source) throw `Could not find a YouTube source for id ${id}`;

  cache.set(cacheKey, source, 86400);
  return source;
};

const getVideos = async (sourceId: string): Promise<Video[]> => {
  const cacheKey = `youtube-source-videos-${sourceId}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) return cacheResult as Video[];

  const playlistId = sourceId.startsWith('PL')
    ? sourceId
    : await getPlaylistIdForChannelUploads(sourceId);
  if (!playlistId) throw `Could not find a YouTube source for id ${sourceId}`;

  const videos = await getVideosForPlaylist(playlistId);

  cache.set(cacheKey, videos, 300);
  return videos;
};

export { searchForSource, getSourceData, getVideos };
