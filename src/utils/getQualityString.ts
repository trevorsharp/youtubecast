import { Quality } from '~/types';
import type { QualityString } from '~/types';

const getQualityString = (quality: Quality): QualityString => {
  switch (quality) {
    case Quality.VideoServer:
      return 'VideoServer';
    case Quality.Audio:
      return 'Audio';
    case Quality.P360:
      return '360p';
    default:
      return '720p';
  }
};

export default getQualityString;
