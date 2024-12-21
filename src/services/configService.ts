import { readdir } from 'node:fs/promises';
import configValidator from '../validators/configValidator';

const CONFIG_FILE_PATH = './config';

const getConfig = async () => {
  try {
    await readdir(CONFIG_FILE_PATH);
  } catch {
    throw 'Config folder does not exist. Please mount a volume at the path "/app/config"';
  }

  const configFile = Bun.file(`${CONFIG_FILE_PATH}/settings.json`);

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
    error.errors.forEach((e) => {
      console.error(e.path.join(' '), ':', e.message);
    });

    throw errorMessage;
  }

  return config;
};

export default { getConfig };
