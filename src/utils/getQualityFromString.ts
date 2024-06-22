import { Quality } from '~/types';

const getQualityFromString = (quality: string): Quality => {
  switch (quality.toLowerCase()) {
    case 'videoserver':
      return Quality.VideoServer;
    case 'audio':
      return Quality.Audio;
    case '360p':
      return Quality.P360;
    default:
      return Quality.Default;
  }
};

export default getQualityFromString;
