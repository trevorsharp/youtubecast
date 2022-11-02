import { spawn } from 'child_process';
import NodeCache from 'node-cache';
import { Quality } from '../types';
import ytdl from 'ytdl-core';

const cache = new NodeCache({ checkperiod: 120 });

const getStream = async (
  videoId: string,
  quality: Quality,
  videoServer?: string | undefined
): Promise<string> => {
  if (videoServer) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const videoLink = await fetch(`http://${videoServer}/${videoId}`, {
      signal: controller.signal,
    })
      .then((response) => (response.status === 200 ? response.text() : undefined))
      .catch(() => undefined);

    clearTimeout(timeout);

    if (videoLink) return `http://${videoServer}${videoLink}`;
  }

  const cacheKey = `video-url-${videoId}-${quality}`;
  const cacheResult = cache.get<string>(cacheKey);
  if (cacheResult) return cacheResult;

  const videoUrl = await getVideoUrl(videoId, quality);

  if (videoUrl === '' || !videoUrl) throw `Video not found with id ${videoId}`;

  cache.set(cacheKey, videoUrl, 3600);

  return videoUrl;
};

const getVideoUrl = async (videoId: string, quality: Quality): Promise<string | undefined> =>
  await spawnChild([`https://www.youtube.com/watch?v=${videoId}`, quality.toString()]);

const spawnChild = async (args: string[]) => {
  const [url, quality] = args;
  const ytdlInfo = await ytdl.getInfo(url as string);
  switch (quality) {
    case '0':
      return ytdlInfo.formats
        .filter((format) => format.qualityLabel === '720p')
        .filter((format) => format.hasAudio)[0]?.url;
    case '1':
      return ytdlInfo.formats
        .filter((format) => format.hasAudio)
        .filter((format) => format.hasVideo === false)[0]?.url;
    case '2':
      return ytdlInfo.formats
        .filter((format) => format.qualityLabel === '360p')
        .filter((format) => format.hasAudio)[0]?.url;
  }
  return '';
};

export { getStream };
