import env from '../env';
import AsyncQueue from '../utils/AsyncQueue';
import configService from './configService';
import videoService from './videoService';

const queue = new AsyncQueue();
const videosInQueue = new Set<string>();

const addVideoToDownloadQueue = async (videoId: string, options?: { addToFrontOfQueue?: boolean }) => {
  const config = await configService.getConfig();

  if (!config.downloadVideos) return;

  const videoFileExists = await Bun.file(`${env.CONTENT_FOLDER_PATH}/${videoId}.m3u8`).exists();

  if (videoFileExists || videosInQueue.has(videoId)) return;

  console.log(`Adding video to queue (${videoId})`);

  videosInQueue.add(videoId);

  queue.push(async () => {
    await videoService.downloadVideo(videoId);
    videosInQueue.delete(videoId);
  }, options);
};

export default { addVideoToDownloadQueue };
