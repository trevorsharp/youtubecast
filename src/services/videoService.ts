import { $ } from 'bun';
import { z } from 'zod';
import env from '../env';
import getYoutubeLink from '../utils/getYoutubeLink';
import configService from './configService';

const getVideoUrl = async (videoId: string, isAudioOnly: boolean) => {
  const videoFileExists = await Bun.file(`${env.CONTENT_FOLDER_PATH}/${videoId}.m3u8`).exists();

  if (videoFileExists && !isAudioOnly) {
    return `/content/${videoId}.m3u8`;
  }

  const format = getStreamingFormat(isAudioOnly);
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
  const videoPartFilePath = `${env.CONTENT_FOLDER_PATH}/${videoId}.video`;
  const audioPartFilePath = `${env.CONTENT_FOLDER_PATH}/${videoId}.audio`;
  const outputVideoFilePath = `${env.CONTENT_FOLDER_PATH}/${videoId}.m3u8`;

  const cookies = await getCookies();
  const youtubeLink = getYoutubeLink(videoId);

  const videoOnlyFormat = await getVideoOnlyFormat();
  const audioOnlyFormat = getAudioOnlyFormat();

  const ffmpegOptions = getFfmpegOptions();

  console.log(`Starting video download (${videoId})`);

  await $`\
    yt-dlp -q ${videoOnlyFormat} ${cookies} --output=${videoPartFilePath} ${youtubeLink} && \
    yt-dlp -q ${audioOnlyFormat} ${cookies} --output=${audioPartFilePath} ${youtubeLink} && \
    ffmpeg -i ${videoPartFilePath} -i ${audioPartFilePath} -c copy -movflags +faststart ${`${env.CONTENT_FOLDER_PATH}/${videoId}.mp4`} && \
    ffmpeg -i ${videoPartFilePath} -i ${audioPartFilePath} ${ffmpegOptions} ${outputVideoFilePath} && \
    rm ${videoPartFilePath} ${audioPartFilePath}
  `
    .then(() => console.log(`Finished downloading video (${videoId})`))
    .catch((error) => console.error('' + error.info.stderr));
};

const getStreamingFormat = (isAudioOnly: boolean) =>
  isAudioOnly ? getAudioOnlyFormat() : '--format=best[height<=720][vcodec^=avc1]';

const getAudioOnlyFormat = () => '--format=bestaudio[acodec^=mp4a][vcodec=none]';

const getVideoOnlyFormat = async () => {
  const config = await configService.getConfig();
  const maxHeight = config.maxVideoQuality.replace('p', '');

  return `--format=bestvideo[height<=${maxHeight}][vcodec^=avc1]`;
};

const getCookies = async () => {
  const hasCookiesTxt = await Bun.file(env.COOKIES_TXT_FILE_PATH).exists();
  if (!hasCookiesTxt) return '';

  return `--cookies=${env.COOKIES_TXT_FILE_PATH}`;
};

const getFfmpegOptions = () => ({
  raw: '-hide_banner -c:v copy -c:a copy -f hls -hls_playlist_type vod -hls_flags single_file',
});

export default { getVideoUrl, downloadVideo };
