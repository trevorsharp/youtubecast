import env from '../env';
import AsyncQueue from '../utils/AsyncQueue';
import configService from './configService';
import videoService from './videoService';

const queue = new AsyncQueue();
const videosInQueue = new Set<string>();

const addVideoToDownloadQueue = async (
  videoId: string,
  options?: { addToFrontOfQueue?: boolean; ignoreQuality?: boolean },
) => {
  const config = await configService.getConfig();

  if (!config.downloadVideos) return;

  const videoFileExtension = config.maximumCompatibility ? 'mp4' : 'm3u8';
  const videoFileExists = await Bun.file(`${env.CONTENT_FOLDER_PATH}/${videoId}.${videoFileExtension}`).exists();

  if (videoFileExists || videosInQueue.has(videoId)) return;

  console.log(`Adding video to queue (${videoId})`);

  videosInQueue.add(videoId);

  queue.push(async () => {
    try {
      await videoService.downloadVideo(videoId, options?.ignoreQuality);
    } finally {
      videosInQueue.delete(videoId);
    }
  }, options);
};

export default { addVideoToDownloadQueue };
