import { $ } from 'bun';
import { z } from 'zod';
import env from '../env';
import getYoutubeLink from '../utils/getYoutubeLink';
import configService from './configService';
import getVideoFilePath from '../utils/getVideoFilePath';

const getStreamingVideoUrl = async (videoId: string, isAudioOnly: boolean) => {
  const format = await getFormat({ isStreaming: true, isAudioOnly });
  const cookies = await getCookies();
  const youtubeLink = getYoutubeLink(videoId);

  const ytdlpOutput = await $`yt-dlp -g ${format} ${cookies} ${youtubeLink}`.text().catch((error) => {
    console.error('' + error.info.stderr);
    return undefined;
  });

  const { data: videoUrl, error } = z.string().url().safeParse(ytdlpOutput);

  if (error) {
    console.error(`yt-dlp did not return a video url for video (${videoId})`);
    return undefined;
  }

  return videoUrl;
};

const downloadVideo = async (videoId: string) => {
  const format = await getFormat();
  const cookies = await getCookies();
  const output = getOutput(videoId);
  const youtubeLink = getYoutubeLink(videoId);

  await $`yt-dlp ${format} ${cookies} ${output} ${youtubeLink}`.catch((error) => {
    console.error('' + error.info.stderr);
  });
};

const getFormat = async (options?: { isStreaming: boolean | undefined; isAudioOnly: boolean | undefined }) => {
  if (options?.isAudioOnly) {
    return '--format=bestaudio[acodec^=mp4a][vcodec=none]';
  }

  if (options?.isStreaming) {
    return '--format=best[height<=720][vcodec^=avc1]';
  }

  const config = await configService.getConfig();
  const maxHeight = config.maxVideoQuality.replace('p', '');

  return `--format=bestvideo[height<=${maxHeight}][vcodec^=avc1]+bestaudio[acodec^=mp4a]`;
};

const getCookies = async () => {
  const hasCookiesTxt = await Bun.file(env.COOKIES_TXT_FILE_PATH).exists();
  if (!hasCookiesTxt) return '';

  return `--cookies=${env.COOKIES_TXT_FILE_PATH}`;
};

const getOutput = (videoId: string) => {
  return `--output=${getVideoFilePath(videoId)}`;
};

export default { getStreamingVideoUrl, downloadVideo };
