import NodeCache from 'node-cache';
import ytdl from 'ytdl-core';
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

  if (!videoUrl) throw `Video not found with id ${videoId}`;

  cache.set(cacheKey, videoUrl, 3600);

  return videoUrl;
};

const getVideoUrl = async (videoId: string, quality: Quality): Promise<string | undefined> => {
  const videoInfo = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, {
    requestOptions: { headers: { cookie: process.env.COOKIES ?? '' } },
  });

  const formats = videoInfo.formats
    .filter(
      (format) =>
        format.hasAudio &&
        format.container === 'mp4' &&
        (!format.hasVideo || format.videoCodec?.includes('avc'))
    )
    .sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0))
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0));

  switch (quality) {
    case Quality.Audio:
      return formats.find((format) => !format.hasVideo)?.url;
    case Quality.P360:
      return formats.find((format) => format.qualityLabel === '360p')?.url;
    default:
      return formats.find((format) => format.hasVideo)?.url;
  }
};

export { getStream };
