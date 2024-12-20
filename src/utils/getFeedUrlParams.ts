import { Quality } from '~/types';

const getFeedUrlParams = (quality: Quality) => {
  const searchParams = new URLSearchParams();

  if (quality !== Quality.Default) searchParams.append('quality', quality.toString());

  return searchParams.toString() ? `?${searchParams.toString()}` : '';
};

export default getFeedUrlParams;
