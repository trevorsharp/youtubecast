import { $ } from 'bun';
import env from '../env';
import getYoutubeLink from '../utils/getYoutubeLink';
import { z } from 'zod';
import logZodError from '../utils/logZodError';
import cacheService from './cacheService';

const getVideoUrl = async (videoId: string, isAudioOnly: boolean) => {
  if (isAudioOnly) {
    return await getStreamingUrl(videoId, 'audio');
  }

  const videoFileExists = await Bun.file(`${env.CONTENT_FOLDER_PATH}/${videoId}.m3u8`).exists();

  if (videoFileExists) {
    return `/content/${videoId}.m3u8`;
  }

  return await getStreamingUrl(videoId, 'video');
};

const getStreamingUrl = cacheService.withCache(
  { cacheKey: 'streaming-url', ttl: 600 },
  async (videoId: string, type: 'video' | 'audio') => {
    const format = type === 'video' ? getVideoStreamingFormat() : getAudioOnlyFormat();
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
  const videoPartFilePath = `${env.CONTENT_FOLDER_PATH}/${videoId}.video`;
  const audioPartFilePath = `${env.CONTENT_FOLDER_PATH}/${videoId}.audio`;
  const outputVideoFilePath = `${env.CONTENT_FOLDER_PATH}/${videoId}.m3u8`;

  const cookies = await getCookies();
  const cookiesAddition = cookies ? '--extractor-args="youtube:player-client=default,-tv,web_safari,web_embedded"' : '';
  const youtubeLink = getYoutubeLink(videoId);

  const videoOnlyFormat = await getVideoOnlyFormat();
  const audioOnlyFormat = getAudioOnlyFormat();

  const ffmpegOptions = getFfmpegOptions();

  console.log(`Starting video download (${videoId})`);

  await $`\
    yt-dlp -q ${videoOnlyFormat} ${cookies} ${cookiesAddition} --output=${videoPartFilePath} ${youtubeLink} && \
    yt-dlp -q ${audioOnlyFormat} ${cookies} ${cookiesAddition} --output=${audioPartFilePath} ${youtubeLink} && \
    ffmpeg -i ${videoPartFilePath} -i ${audioPartFilePath} ${ffmpegOptions} ${outputVideoFilePath} && \
    rm ${videoPartFilePath} ${audioPartFilePath}
  `
    .then(() => console.log(`Finished downloading video (${videoId})`))
    .catch((error) => console.error('' + error.info.stderr));
};

const getVideoStreamingFormat = () => `--format=best[height<=720][vcodec^=avc1]`;

const getAudioOnlyFormat = () => '--format=bestaudio[acodec^=mp4a][vcodec=none]';

const getVideoOnlyFormat = async () => `--format=bestvideo[height<=1080][vcodec^=avc1]`;

const getCookies = async () => {
  const hasCookiesTxt = await Bun.file(env.COOKIES_TXT_FILE_PATH).exists();
  if (!hasCookiesTxt) return '';

  return `--cookies=${env.COOKIES_TXT_FILE_PATH}`;
};

const getFfmpegOptions = () => ({
  raw: '-hide_banner -loglevel error -c:v copy -c:a copy -f hls -hls_playlist_type vod -hls_flags single_file',
});

export default { getVideoUrl, downloadVideo };
