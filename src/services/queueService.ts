import env from '../env';
import videoService from './videoService';

const queue: string[] = [];

const addVideoToDownloadQueue = async (videoId: string) => {
  const videoFile = Bun.file(`${env.CONTENT_FOLDER_PATH}/${videoId}.m3u8`);

  const videoFileExists = await videoFile.exists();
  if (videoFileExists) return;

  if (!queue.some((v) => v === videoId)) {
    console.log(`Adding video to queue (${videoId})`);
    queue.push(videoId);
    downloadNextVideoInQueue();
  }
};

let isDownloadInProgress = false;

const downloadNextVideoInQueue = async () => {
  try {
    if (isDownloadInProgress) return;
    isDownloadInProgress = true;

    const nextVideoToDownload = queue.shift();

    if (!nextVideoToDownload) return;

    await videoService.downloadVideo(nextVideoToDownload);
  } finally {
    isDownloadInProgress = false;
  }
};

export default { addVideoToDownloadQueue, downloadNextVideoInQueue };
