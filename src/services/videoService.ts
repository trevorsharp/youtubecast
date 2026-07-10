import { $ } from 'bun';
import env from '../env';
import getYoutubeLink from '../utils/getYoutubeLink';
import { z } from 'zod';
import logZodError from '../utils/logZodError';
import cacheService from './cacheService';
import configService from './configService';

type YtDlpArgs = string[];

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
    const cookies = await getCookies();
    const youtubeLink = getYoutubeLink(videoId);

    if (type === 'audio') {
      return await getStreamingUrlFromYtDlp(
        videoId,
        youtubeLink,
        cookies,
        getAudioOnlyFormat(),
        getDefaultExtractorArgs(),
      );
    }

    const hlsStreamingUrl = await getStreamingUrlFromYtDlp(
      videoId,
      youtubeLink,
      cookies,
      await getStreamingVideoHlsFormat(),
      getWebSafariExtractorArgs(),
      false,
    );

    if (hlsStreamingUrl) {
      return hlsStreamingUrl;
    }

    return await getStreamingUrlFromYtDlp(
      videoId,
      youtubeLink,
      cookies,
      getStreamingVideoFallbackFormat(),
      getDefaultExtractorArgs(),
    );
  },
);

const getStreamingUrlFromYtDlp = async (
  videoId: string,
  youtubeLink: string,
  cookies: YtDlpArgs,
  format: YtDlpArgs,
  extractorArgs: YtDlpArgs,
  logFailures = true,
) => {
  let parseError: z.ZodError<string | undefined> | undefined;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const ytdlpResponse =
      await $`yt-dlp -q -g --js-runtimes=bun --remote-components=ejs:npm ${format} ${cookies} ${extractorArgs} ${youtubeLink}`
        .text()
        .catch((error) => {
          if (logFailures)
            console.error(`Failed to get streaming URL (${videoId}, attempt ${attempt}/2): ${error.info.stderr}`);
        });

    const { data: streamingUrl, error } = z.string().url().safeParse(ytdlpResponse?.trim());

    if (!error) {
      return streamingUrl;
    }

    parseError = error;
  }

  if (parseError && logFailures) {
    logZodError(parseError);
  }

  return undefined;
};

const downloadVideo = async (videoId: string, ignoreQuality: boolean | undefined) => {
  const config = await configService.getConfig();

  const videoPartFilePath = `${env.CONTENT_FOLDER_PATH}/${videoId}.video.mp4`;
  const audioPartFilePath = `${env.CONTENT_FOLDER_PATH}/${videoId}.audio.m4a`;
  const outputVideoFilePath = config.maximumCompatibility
    ? `${env.CONTENT_FOLDER_PATH}/${videoId}.mp4`
    : `${env.CONTENT_FOLDER_PATH}/${videoId}.m3u8`;
  const hlsSegmentFilePath = `${env.CONTENT_FOLDER_PATH}/${videoId}.ts`;

  const videoFormat = await getDownloadVideoFormat(ignoreQuality);
  const audioFormat = getDownloadAudioFormat();
  const cookies = await getCookies();
  const extractorArgs = getDefaultExtractorArgs();
  const youtubeLink = getYoutubeLink(videoId);

  const ffmpegOptions = config.maximumCompatibility ? getFfmpegMaximumCompatibilityOptions() : getFfmpegOptions();

  console.log(`Starting video download (${videoId})`);

  await $`\
    rm -f ${videoPartFilePath} ${audioPartFilePath} ${outputVideoFilePath} ${hlsSegmentFilePath} && \
    yt-dlp -q --js-runtimes=bun --remote-components=ejs:npm ${videoFormat} ${cookies} ${extractorArgs} --output=${videoPartFilePath} ${youtubeLink} && \
    yt-dlp -q --js-runtimes=bun --remote-components=ejs:npm ${audioFormat} ${cookies} ${extractorArgs} --output=${audioPartFilePath} ${youtubeLink} && \
    ffmpeg -i ${videoPartFilePath} -i ${audioPartFilePath} ${ffmpegOptions} ${outputVideoFilePath} && \
    rm -f ${videoPartFilePath} ${audioPartFilePath}
  `
    .then(() => console.log(`Finished downloading video (${videoId})`))
    .catch((error) => console.error('' + error.info.stderr));
};

const getDownloadVideoFormat = async (ignoreQuality?: boolean | undefined) => {
  const config = await configService.getConfig();
  const downloadFormat =
    config.highestQuality && !ignoreQuality
      ? 'bestvideo[vcodec^=avc1][height>=1080]'
      : 'bestvideo[vcodec^=avc1][height<=1080][height>=720]/bestvideo[vcodec^=avc1][height<=1080]';

  return [`--format=${downloadFormat}`];
};

const getDownloadAudioFormat = () => ['--format=bestaudio[acodec^=mp4a][vcodec=none]'];

const getStreamingVideoHlsFormat = async () => {
  const config = await configService.getConfig();
  const hlsFormat = config.highestQuality
    ? 'best[protocol^=m3u8][vcodec^=avc1][acodec^=mp4a][height>=720]'
    : 'best[protocol^=m3u8][vcodec^=avc1][acodec^=mp4a][height>=720][height<=720]/best[protocol^=m3u8][vcodec^=avc1][acodec^=mp4a][height>=720]';

  return [`--format=${hlsFormat}`];
};

const getStreamingVideoFallbackFormat = () => [
  '--format=best[ext=mp4][vcodec^=avc1][acodec^=mp4a]/best[vcodec^=avc1][acodec^=mp4a]',
];

const getAudioOnlyFormat = () => ['--format=bestaudio[acodec^=mp4a][vcodec=none]'];

const getCookies = async () => {
  const hasCookiesTxt = await Bun.file(env.COOKIES_TXT_FILE_PATH).exists();
  if (!hasCookiesTxt) return [];

  return [`--cookies=${env.COOKIES_TXT_FILE_PATH}`];
};

const getDefaultExtractorArgs = () => [];

const getWebSafariExtractorArgs = () => ['--extractor-args=youtube:player_client=web_safari'];

const getFfmpegOptions = () => ({
  raw: '-y -hide_banner -loglevel error -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy -f hls -hls_playlist_type vod -hls_flags single_file',
});

const getFfmpegMaximumCompatibilityOptions = () => ({
  raw: '-y -hide_banner -loglevel error -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy -movflags +faststart',
});

export default { getVideoUrl, downloadVideo };
