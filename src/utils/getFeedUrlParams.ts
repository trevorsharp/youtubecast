import { Quality } from '~/types';

const getFeedUrlParams = (
  quality: Quality,
  excludeShorts: boolean,
  videoServer?: string | undefined
) => {
  const searchParams = new URLSearchParams();

  if (videoServer) searchParams.append('videoServer', videoServer);
  if (quality !== Quality.Default) searchParams.append('quality', quality.toString());
  if (excludeShorts) searchParams.append('excludeShorts', '');

  const searchParamsString = searchParams.toString().replace('excludeShorts=', 'excludeShorts');

  return searchParamsString ? `?${searchParamsString}` : '';
};

export default getFeedUrlParams;
