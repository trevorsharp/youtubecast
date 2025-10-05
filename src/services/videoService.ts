import { $ } from 'bun';
import env from '../env';
import getYoutubeLink from '../utils/getYoutubeLink';
import { z } from 'zod';
import logZodError from '../utils/logZodError';
import cacheService from './cacheService';
import configService from './configService';

const getVideoUrl = async (videoId: string, isAudioOnly: boolean) => {
  if (isAudioOnly) {
    return await getStreamingUrl(videoId, 'audio');
  }

  const m3u8FileExists = await Bun.file(`${env.CONTENT_FOLDER_PATH}/${videoId}.m3u8`).exists();

  if (m3u8FileExists) {
    return `/content/${videoId}.m3u8`;
  }

  const mp4FileExists = await Bun.file(`${env.CONTENT_FOLDER_PATH}/${videoId}.mp4`).exists();

  if (mp4FileExists) {
    return `/content/${videoId}.mp4`;
  }

  const config = await configService.getConfig();

  if (config.maximumCompatibility) {
    return undefined;
  }

  return await getStreamingUrl(videoId, 'video');
};

const getStreamingUrl = cacheService.withCache(
  { cacheKey: 'streaming-url', ttl: 600 },
  async (videoId: string, type: 'video' | 'audio') => {
    const format = type === 'video' ? getVideoFormat() : getAudioOnlyFormat();
    const cookies = await getCookies();
    const youtubeLink = getYoutubeLink(videoId);

    const ytdlpResponse = await $`yt-dlp -q -g ${format} ${cookies} ${youtubeLink}`
      .text()
      .catch((error) => console.error('' + error.info.stderr));

    const { data: audioStreamingUrl, error } = z.string().url().safeParse(ytdlpResponse);

    if (error) {
      logZodError(error);
      return undefined;
    }

    return audioStreamingUrl;
  },
);

const downloadVideo = async (videoId: string) => {
  const config = await configService.getConfig();

  const videoPartFilePath = `${env.CONTENT_FOLDER_PATH}/${videoId}.video`;
  const outputVideoFilePath = config.maximumCompatibility
    ? `${env.CONTENT_FOLDER_PATH}/${videoId}.mp4`
    : `${env.CONTENT_FOLDER_PATH}/${videoId}.m3u8`;

  const cookies = await getCookies();
  const extractorArgs = await getExtractorArgs();
  const youtubeLink = getYoutubeLink(videoId);

  const ffmpegOptions = config.maximumCompatibility ? getFfmpegMaximumCompatibilityOptions() : getFfmpegOptions();

  console.log(`Starting video download (${videoId})`);

  await $`\
    yt-dlp -q ${getVideoFormat()} ${cookies} ${extractorArgs} --output=${videoPartFilePath} ${youtubeLink} && \
    ffmpeg -i ${videoPartFilePath} ${ffmpegOptions} ${outputVideoFilePath} && \
    rm ${videoPartFilePath}
  `
    .then(() => console.log(`Finished downloading video (${videoId})`))
    .catch((error) => console.error('' + error.info.stderr));
};

const getVideoFormat = () => `--format=best[vcodec^=avc1][acodec^=mp4a]`;

const getAudioOnlyFormat = () => '--format=bestaudio[acodec^=mp4a][vcodec=none]';

const getCookies = async () => {
  const hasCookiesTxt = await Bun.file(env.COOKIES_TXT_FILE_PATH).exists();
  if (!hasCookiesTxt) return '';

  return `--cookies=${env.COOKIES_TXT_FILE_PATH}`;
};

const getExtractorArgs = async () => {
  const hasCookiesTxt = await Bun.file(env.COOKIES_TXT_FILE_PATH).exists();
  if (!hasCookiesTxt) return '';

  return `--extractor-args=youtube:player-client=default,-tv,web_safari,web_embedded`;
};

const getFfmpegOptions = () => ({
  raw: '-hide_banner -loglevel error -c:v copy -c:a copy -f hls -hls_playlist_type vod -hls_flags single_file',
});

const getFfmpegMaximumCompatibilityOptions = () => ({
  raw: '-hide_banner -loglevel error -c:v copy -c:a copy',
});

export default { getVideoUrl, downloadVideo };
