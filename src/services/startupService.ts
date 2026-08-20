import { $ } from 'bun';
import configService from './configService';
import env from '../env';
import { readdir, rm } from 'node:fs/promises';

const startApplication = async () => {
  await configService.getConfig();
  await $`yt-dlp --update-to nightly`.catch((error) => {
    console.warn('Unable to update yt-dlp; continuing startup.', error.stderr?.toString().trim() ?? error.message);
  });

  const contentFolderExists = await configService
    .verifyContentFolderExists()
    .then(() => true)
    .catch(() => false);

  if (contentFolderExists) {
    const contentFolderEntries = await readdir(env.CONTENT_FOLDER_PATH, { withFileTypes: true });
    await Promise.all(
      contentFolderEntries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('.youtubecast-'))
        .map((entry) => rm(`${env.CONTENT_FOLDER_PATH}/${entry.name}`, { recursive: true, force: true })),
    );
    await $`find ${env.CONTENT_FOLDER_PATH} -name "*.video" -type f -delete`;
    await $`find ${env.CONTENT_FOLDER_PATH} -name "*.video.mp4" -type f -delete`;
    await $`find ${env.CONTENT_FOLDER_PATH} -name "*.audio" -type f -delete`;
    await $`find ${env.CONTENT_FOLDER_PATH} -name "*.audio.m4a" -type f -delete`;
  }
};

export default { startApplication };
