import videoService from './videoService';
import getVideoFilePath from '../utils/getVideoFilePath';

const queue: string[] = [];

const addVideoToDownloadQueue = async (videoId: string) => {
  const videoFile = Bun.file(getVideoFilePath(videoId));

  const videoFileExists = await videoFile.exists();
  if (videoFileExists) return;

  if (!queue.some((v) => v === videoId)) {
    console.log(`Adding video to queue (${videoId})`);
    queue.push(videoId);
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
