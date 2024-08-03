import cacheService from './cacheService';
import { getPlaylistVideoIds } from './playlistService';
import { searchChannels } from './searchService';
import { getChannelDetails, getPlaylistDetails, getPlaylistVideos } from './youtubeService';
import type { Source, Video } from '~/types';

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

  const source = await getSource(sourceId);

  return source;
};

const getSourceAndVideos = async (sourceId: string) => {
  const playlistId = getPlaylistId(sourceId);
  const cacheKey = `source-and-videos-${sourceId}`;

  const [playlistVideoIds, cacheResult] = await Promise.all([
    getPlaylistVideoIds(playlistId),
    cacheService.get<[Source, Video[]]>(cacheKey),
  ]);

  const [cachedSource, cachedVideos] = cacheResult ?? [undefined, undefined];
  const cacheContainsAllVideos =
    cachedVideos &&
    !playlistVideoIds.some((videoId) => !cachedVideos.some((v) => v.id === videoId));

  if (cachedSource && cacheContainsAllVideos) {
    return [cachedSource, cachedVideos] as const;
  }

  const [source, videos] = await Promise.all([getSource(sourceId), getPlaylistVideos(playlistId)]);

  const cacheHours = videos.some((v) => (v.isProcessing || v.isLive) && !v.isPrivate) ? 1 : 6;
  await cacheService.set(cacheKey, [source, videos], cacheHours * 60 * 60);

  return [source, videos] as const;
};

const getSource = async (id: string) => {
  const cacheKey = `source-${id}`;
  const cacheResult = await cacheService.get<Source>(cacheKey);
  if (cacheResult) return cacheResult;

  const source = id.startsWith('UC')
    ? await getChannelDetails(id)
    : id.startsWith('PL') || id.startsWith('UU')
      ? await getPlaylistDetails(id)
      : null;

  if (!source) throw `Could not find a YouTube source for id ${id} 🤷`;

  const cacheDays = 5 + 2 * Math.random();
  await cacheService.set(cacheKey, source, Math.floor(cacheDays * 24 * 60 * 60));

  return source;
};

const getPlaylistId = (sourceId: string) => sourceId.replace(/^UC/, 'UU');

export { getSourceAndVideos, searchForSource };
