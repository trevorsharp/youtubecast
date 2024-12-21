import { $ } from 'bun';
import { z } from 'zod';

const COOKIES_TXT_FILE_PATH = './config/cookies.txt';

const getVideoUrl = async (videoId: string, isAudioOnly: boolean) => {
  const format = isAudioOnly ? 'bestaudio[acodec^=mp4a][vcodec=none]' : 'best[height<=720][vcodec^=avc1]';

  const hasCookiesTxt = await Bun.file(COOKIES_TXT_FILE_PATH).exists();

  const ytdlpOutput =
    await $`yt-dlp -g --format=${format} ${hasCookiesTxt ? `--cookies=${COOKIES_TXT_FILE_PATH}` : ''} https://youtu.be/${videoId}`
      .text()
      .catch((error) => {
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

export default { getVideoUrl };
