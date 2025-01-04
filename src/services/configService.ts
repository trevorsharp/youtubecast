import { readdir } from 'node:fs/promises';
import configValidator from '../validators/configValidator';
import logZodError from '../utils/logZodError';
import env from '../env';

const configFile = Bun.file(`${env.CONFIG_FOLDER_PATH}/settings.json`);

const getConfig = async () => {
  try {
    await readdir(env.CONFIG_FOLDER_PATH);
  } catch {
    throw 'Config folder does not exist. Please mount a volume at the path "/app/config".';
  }

  const configFileExists = await configFile.exists();
  if (!configFileExists) {
    await Bun.write(
      configFile,
      JSON.stringify({
        youtubeApiKey: process.env['YOUTUBE_API_KEY'] ?? '',
      }),
    );

    throw 'Please open the settings.json file in your config folder and verify the required fields.';
  }

  const errorMessage =
    'There was a problem with your settings. Please open the settings.json file in your config folder and correct the issue.';

  const configFileContents = await configFile
    .text()
    .then((text) => JSON.parse(text))
    .catch(() => {
      throw errorMessage;
    });

  const { data: config, error } = configValidator.safeParse(configFileContents);

  if (error) {
    logZodError(error);
    throw errorMessage;
  }

  try {
    await readdir(env.CONTENT_FOLDER_PATH);
  } catch {
    throw 'Content folder does not exist. Please mount a volume at the path "/app/content" or lower your "maxVideoQuality" setting to "720p".';
  }

  return config;
};

export default { getConfig };
