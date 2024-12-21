import type { z } from 'zod';
import logZodError from '../utils/logZodError';
import queueValidator from '../validators/queueValidator';
import videoService from './videoService';
import env from '../env';
import getVideoFilePath from '../utils/getVideoFilePath';

type Queue = z.infer<typeof queueValidator>;

const queueFile = Bun.file(env.QUEUE_FILE_PATH);

const getQueue = async () => {
  const queueFileExists = await queueFile.exists();
  if (!queueFileExists) {
    return [];
  }

  const errorMessage =
    'There was a problem with your queue. Please open the queue.json file in your config folder and correct the issue.';

  const queueFileContent = await queueFile
    .text()
    .then((text) => JSON.parse(text))
    .catch(() => {
      throw errorMessage;
    });

  const { data: queue, error } = queueValidator.safeParse(queueFileContent);

  if (error) {
    logZodError(error);
    throw errorMessage;
  }

  return queue;
};

const saveQueue = async (queue: Queue) => {
  await Bun.write(queueFile, JSON.stringify(queue));
};

const addVideoToDownloadQueue = async (video: { id: string; title: string }) => {
  const videoFile = Bun.file(getVideoFilePath(video.id));

  const videoFileExists = await videoFile.exists();
  if (videoFileExists) return;

  const queue = await getQueue();

  if (!queue.some((v) => v.id === video.id)) {
    console.log(`Adding video to queue (${video.id})`);
    queue.push({ id: video.id, title: video.title });
    await saveQueue(queue);
  }
};

let isDownloadInProgress = false;

const downloadNextVideoInQueue = async () => {
  try {
    if (isDownloadInProgress) return;
    isDownloadInProgress = true;

    const nextVideoToDownload = await getQueue().then((queue) => queue.shift());

    if (!nextVideoToDownload) return;

    await videoService.downloadVideo(nextVideoToDownload.id);

    const updatedQueue = await getQueue().then((queue) => queue.filter((video) => video.id !== nextVideoToDownload.id));

    await saveQueue(updatedQueue);
  } finally {
    isDownloadInProgress = false;
  }
};

export default { addVideoToDownloadQueue, downloadNextVideoInQueue };
