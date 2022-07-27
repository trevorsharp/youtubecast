import type { NextApiRequest, NextApiResponse } from 'next';
import { getStream } from '../../../services/videoService';
import { Quality } from '../../../types';

const getVideoUrl = async (req: NextApiRequest, res: NextApiResponse) => {
  let quality = !Array.isArray(req.query.quality)
    ? parseInt(req.query.quality ?? '')
    : req.query.quality.length > 0
    ? parseInt(req.query.quality[0] ?? '')
    : Quality.Default;

  if (isNaN(quality)) quality = Quality.Default;

  return getStream(req.query.videoId as string, quality)
    .then((streamUrl) => res.status(307).redirect(encodeURI(streamUrl).replaceAll('%25', '%')))
    .catch((e) => res.status(500).send(e ?? 'Unexpected Error'));
};

export default getVideoUrl;
