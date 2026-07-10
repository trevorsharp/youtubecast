import { $ } from 'bun';
import configService from './configService';
import env from '../env';

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
    await $`find ${env.CONTENT_FOLDER_PATH} -name "*.video" -type f -delete`;
    await $`find ${env.CONTENT_FOLDER_PATH} -name "*.video.mp4" -type f -delete`;
    await $`find ${env.CONTENT_FOLDER_PATH} -name "*.audio" -type f -delete`;
    await $`find ${env.CONTENT_FOLDER_PATH} -name "*.audio.m4a" -type f -delete`;
  }
};

export default { startApplication };
