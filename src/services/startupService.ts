import { $ } from 'bun';
import configService from './configService';
import env from '../env';

const startApplication = async () => {
  await configService.getConfig();
  await $`yt-dlp -U`;
  await $`find ${env.CONTENT_FOLDER_PATH} -name "*.video" -type f -delete`;
  await $`find ${env.CONTENT_FOLDER_PATH} -name "*.audio" -type f -delete`;
};

export default { startApplication };
