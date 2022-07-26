import { spawn } from 'child_process';
import NodeCache from 'node-cache';
import { Quality } from '../types';

const cache = new NodeCache({ checkperiod: 120 });

const getStream = async (videoId: string, quality: Quality): Promise<string> => {
  const cacheKey = `video-url-${videoId}-${quality}`;
  const cacheResult = cache.get(cacheKey);
  if (cacheResult) return cacheResult as string;

  const videoUrl = await getVideoUrl(videoId, quality);

  console.log(videoUrl);

  if (videoUrl === '') throw `Video not found with id ${videoId}`;

  cache.set(cacheKey, videoUrl, 600);

  return videoUrl;
};

const getVideoUrl = async (videoId: string, quality: Quality): Promise<string> => {
  let format = '22';

  switch (quality) {
    case Quality.Audio:
      format = '140';
      break;
    case Quality.P360:
      format = '18';
      break;
  }

  console.log(quality, format);

  return await spawnChild(['-g', '-f', format, `youtu.be/${videoId}`]);
};

const spawnChild = async (args: string[]) => {
  const child = spawn('yt-dlp', args);

  let data = '';
  for await (const chunk of child.stdout) data += chunk;

  await new Promise((resolve, _) => child.on('close', resolve));

  return data;
};

export { getStream };
