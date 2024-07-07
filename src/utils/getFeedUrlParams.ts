import { Quality } from '~/types';

const getFeedUrlParams = (
  quality: Quality,
  excludeShorts: boolean,
  videoServer?: string | undefined,
) => {
  const searchParams = new URLSearchParams();

  if (quality !== Quality.Default && quality !== Quality.VideoServer)
    searchParams.append('quality', quality.toString());
  if (quality === Quality.VideoServer && videoServer)
    searchParams.append('videoServer', videoServer);
  if (excludeShorts) searchParams.append('excludeShorts', '');

  const searchParamsString = searchParams.toString().replace('excludeShorts=', 'excludeShorts');

  return searchParamsString ? `?${searchParamsString}` : '';
};

export default getFeedUrlParams;
