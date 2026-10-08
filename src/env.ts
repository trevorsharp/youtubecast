const CONFIG_BASE = process.env['CONFIG_BASE'] ?? '/app';
const CONFIG_FOLDER_PATH = `${CONFIG_BASE}/config`;
const CONTENT_FOLDER_PATH = `${CONFIG_BASE}/content`;
const COOKIES_TXT_FILE_PATH = `${CONFIG_BASE}/config/cookies.txt`;
const UI_FOLDER_PATH = `${process.env['APP_DIR'] ?? '/app'}/static`;

export default {
  CONFIG_FOLDER_PATH,
  CONTENT_FOLDER_PATH,
  COOKIES_TXT_FILE_PATH,
  UI_FOLDER_PATH,
};
