import { spawn } from 'child_process';
import NodeCache from 'node-cache';
import { Quality } from '../types';

const cache = new NodeCache({ checkperiod: 120 });

const getStream = async (
  videoId: string,
  quality: Quality,
  videoServer?: string | undefined
): Promise<string> => {
  if (videoServer) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const videoLink = await fetch(`http://${videoServer}/${videoId}`, { signal: controller.signal })
      .then((response) => response.text())
      .catch(() => undefined);

    clearTimeout(timeout);

    if (videoLink) return `http://${videoServer}${videoLink}`;
  }

  const cacheKey = `video-url-${videoId}-${quality}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) return cacheResult as string;

  const videoUrl = await getVideoUrl(videoId, quality);

  if (videoUrl === '') throw `Video not found with id ${videoId}`;

  cache.set(cacheKey, videoUrl, 3600);

  return videoUrl;
};

const getVideoUrl = async (videoId: string, quality: Quality): Promise<string> =>
  await spawnChild([`https://www.youtube.com/watch?v=${videoId}`, quality.toString()]);

const spawnChild = async (args: string[]) => {
  const child = spawn('python3', ['getStreamLink.py', ...args]);

  let data = '';
  for await (const chunk of child.stdout) data += chunk;

  await new Promise((resolve, _) => child.on('close', resolve));

  return data;
};

export { getStream };
