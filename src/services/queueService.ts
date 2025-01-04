import env from '../env';
import videoService from './videoService';

const queue: string[] = [];

const addVideoToDownloadQueue = async (videoId: string, options?: { addToFrontOfQueue?: boolean }) => {
  const videoFile = Bun.file(`${env.CONTENT_FOLDER_PATH}/${videoId}.m3u8`);

  const videoFileExists = await videoFile.exists();
  if (videoFileExists) {
    return;
  }

  if (!queue.some((v) => v === videoId)) {
    if (options?.addToFrontOfQueue) {
      queue.unshift(videoId);
    } else {
      queue.push(videoId);
    }
    console.log(`Adding video to queue (${videoId})`);
  }
};

let isDownloadInProgress = false;

const downloadNextVideoInQueue = async () => {
  try {
    if (isDownloadInProgress || queue.length === 0) {
      return;
    }

    isDownloadInProgress = true;
    await videoService.downloadVideo(queue[0]);
    queue.shift();
  } finally {
    isDownloadInProgress = false;
  }
};

export default { addVideoToDownloadQueue, downloadNextVideoInQueue };
