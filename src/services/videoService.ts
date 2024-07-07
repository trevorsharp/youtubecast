import ytdl from 'ytdl-core';
import { env } from '~/env';
import { Quality } from '~/types';
import cacheService from './cacheService';

const getStream = async (videoId: string, quality: Quality, videoServer?: string | undefined) => {
  if (videoServer) {
    const timeout = new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Video server request timed out')), 2000),
    );

    const videoLink = await Promise.race([await fetch(`http://${videoServer}/${videoId}`), timeout])
      .then((response) => (response.status === 200 ? response.text() : undefined))
      .catch(() => undefined);

    if (videoLink) return `http://${videoServer}${videoLink}`;
  }

  const cacheKey = `video-url-${videoId}-${quality}`;
  const cacheResult = await cacheService.get<string>(cacheKey);
  if (cacheResult) return cacheResult;

  const videoUrl = await getVideoUrl(videoId, quality);

  if (!videoUrl) throw `Video not found with id ${videoId}`;

  await cacheService.set(cacheKey, videoUrl, 3600);

  return videoUrl;
};

const getVideoUrl = async (videoId: string, quality: Quality) => {
  const videoInfo = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, {
    requestOptions: { headers: { cookie: env.COOKIES ?? '' } },
  });

  const formats = videoInfo.formats
    .filter(
      (format) =>
        format.hasAudio &&
        format.container === 'mp4' &&
        (!format.hasVideo || format.videoCodec?.includes('avc')),
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
