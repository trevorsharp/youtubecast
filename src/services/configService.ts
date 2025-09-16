import { readdir } from 'node:fs/promises';
import configValidator from '../validators/configValidator';
import logZodError from '../utils/logZodError';
import env from '../env';

const configFile = Bun.file(`${env.CONFIG_FOLDER_PATH}/settings.json`);

const getConfig = async () => {
  await verifyConfigFolderExists();
  await verifyConfigFileExists();

  const config = await validateConfigFile();

  if (config.downloadVideos) {
    await verifyContentFolderExists();
  }

  return config;
};

const verifyConfigFolderExists = async () => {
  try {
    await readdir(env.CONFIG_FOLDER_PATH);
  } catch {
    throw 'Config folder does not exist. Please mount a volume at the path "/app/config".';
  }
};

const verifyContentFolderExists = async () => {
  try {
    await readdir(env.CONTENT_FOLDER_PATH);
  } catch {
    throw 'Content folder does not exist. Please mount a volume at the path "/app/content".';
  }
};

const verifyConfigFileExists = async () => {
  const configFileExists = await configFile.exists();

  if (!configFileExists) {
    await Bun.write(
      configFile,
      JSON.stringify(
        {
          youtubeApiKey: process.env['YOUTUBE_API_KEY'] ?? '',
          downloadVideos: false
        },
        null,
        2,
      ),
    );

    try {
      await validateConfigFile();
    } catch {
      throw 'Please open the settings.json file in your config folder and verify the required fields have been added.';
    }
  }
};

const validateConfigFile = async () => {
  const errorMessage =
    'There was a problem with your settings. Please open the settings.json file in your config folder and correct the issue.';

  const configFileContents = await configFile
    .text()
    .then(JSON.parse)
    .catch(() => {
      throw errorMessage;
    });

  const { data: config, error } = configValidator.safeParse(configFileContents);

  if (error) {
    logZodError(error);
    throw errorMessage;
  }

  return config;
};

export default { getConfig };
