import { $ } from 'bun';
import configService from './configService';
import env from '../env';

const startApplication = async () => {
  await configService.getConfig();

  await $`/usr/bin/yt-dlp -U`;

  await $`rm -f ${env.CONFIG_FOLDER_PATH}/*.video ${env.CONFIG_FOLDER_PATH}/*.audio`;
};

export default { startApplication };
