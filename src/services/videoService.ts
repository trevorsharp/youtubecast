import { $ } from 'bun';
import env from '../env';
import getYoutubeLink from '../utils/getYoutubeLink';
import { z } from 'zod';
import logZodError from '../utils/logZodError';
import cacheService from './cacheService';
import configService from './configService';
import { mkdtemp, rename, rm } from 'node:fs/promises';

type YtDlpArgs = string[];

const getVideoUrl = async (videoId: string, isAudioOnly: boolean, isHls: boolean) => {
  if (isAudioOnly) {
    return await getStreamingUrl(videoId, 'audio');
  }

  const config = await configService.getConfig();

  if (config.maximumCompatibility) {
    if (isHls) return undefined;

    const mp4FileExists = await Bun.file(`${env.CONTENT_FOLDER_PATH}/${videoId}.mp4`).exists();

    return mp4FileExists ? `/content/${videoId}.mp4` : undefined;
  }

  const m3u8FileExists = await Bun.file(`${env.CONTENT_FOLDER_PATH}/${videoId}.m3u8`).exists();

  if (m3u8FileExists) {
    return `/content/${videoId}.m3u8`;
  }

  if (isHls) {
    return await getHlsStreamingUrl(videoId);
  }

  return await getStreamingUrl(videoId, 'video');
};

const getStreamingUrl = cacheService.withCache(
  { cacheKey: 'streaming-url', ttl: 600 },
  async (videoId: string, type: 'video' | 'audio') => {
    if (type === 'audio') {
      return await getStreamingUrlFromYtDlp(
        videoId,
        getYoutubeLink(videoId),
        await getCookies(),
        getAudioOnlyFormat(),
        getDefaultExtractorArgs(),
      );
    }

    const hlsStreamingUrl = await getHlsStreamingUrl(videoId);

    if (hlsStreamingUrl) {
      return hlsStreamingUrl;
    }

    return await getStreamingUrlFromYtDlp(
      videoId,
      getYoutubeLink(videoId),
      await getCookies(),
      getStreamingVideoFallbackFormat(),
      getDefaultExtractorArgs(),
    );
  },
);

const getHlsStreamingUrl = cacheService.withCache(
  { cacheKey: 'hls-streaming-url', ttl: 600 },
  async (videoId: string) => {
    const cookies = await getCookies();
    const youtubeLink = getYoutubeLink(videoId);

    return await getStreamingUrlFromYtDlp(
      videoId,
      youtubeLink,
      cookies,
      await getStreamingVideoHlsFormat(),
      getWebSafariExtractorArgs(),
      false,
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
  const stagingFolderPath = await mkdtemp(`${env.CONTENT_FOLDER_PATH}/.youtubecast-`);

  const videoPartFilePath = `${stagingFolderPath}/video.mp4`;
  const audioPartFilePath = `${stagingFolderPath}/audio.m4a`;
  const outputVideoFileName = config.maximumCompatibility ? `${videoId}.mp4` : `${videoId}.m3u8`;
  const stagedOutputVideoFilePath = `${stagingFolderPath}/${outputVideoFileName}`;
  const outputVideoFilePath = `${env.CONTENT_FOLDER_PATH}/${outputVideoFileName}`;
  const stagedHlsSegmentFilePath = `${stagingFolderPath}/${videoId}.ts`;
  const hlsSegmentFilePath = `${env.CONTENT_FOLDER_PATH}/${videoId}.ts`;

  const videoFormat = await getDownloadVideoFormat(ignoreQuality);
  const audioFormat = getDownloadAudioFormat();
  const cookies = await getCookies();
  const extractorArgs = getDefaultExtractorArgs();
  const youtubeLink = getYoutubeLink(videoId);

  const ffmpegOptions = config.maximumCompatibility ? getFfmpegMaximumCompatibilityOptions() : getFfmpegOptions();

  console.log(`Starting video download (${videoId})`);

  try {
    await $`\
      yt-dlp -q --js-runtimes=bun --remote-components=ejs:npm ${videoFormat} ${cookies} ${extractorArgs} --output=${videoPartFilePath} ${youtubeLink} && \
      yt-dlp -q --js-runtimes=bun --remote-components=ejs:npm ${audioFormat} ${cookies} ${extractorArgs} --output=${audioPartFilePath} ${youtubeLink} && \
      ffmpeg -i ${videoPartFilePath} -i ${audioPartFilePath} ${ffmpegOptions} ${stagedOutputVideoFilePath}
    `;

    if (!config.maximumCompatibility) {
      await rename(stagedHlsSegmentFilePath, hlsSegmentFilePath);
    }
    await rename(stagedOutputVideoFilePath, outputVideoFilePath);

    console.log(`Finished downloading video (${videoId})`);
  } catch (error) {
    const shellError = error as { info?: { stderr?: unknown } };
    console.error(`${shellError.info?.stderr ?? error}`);
  } finally {
    await rm(stagingFolderPath, { recursive: true, force: true });
  }
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
