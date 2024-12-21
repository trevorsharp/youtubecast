import env from '../env';

export default (videoId: string) => `${env.CONTENT_FOLDER_PATH}/${videoId}${env.VIDEO_FILE_EXTENSION}`;
