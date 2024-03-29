import { getStream } from '~/services/videoService';
import { Quality } from '~/types';
import type { NextApiRequest, NextApiResponse } from 'next';

const getVideoUrl = async (req: NextApiRequest, res: NextApiResponse) => {
  let quality = !Array.isArray(req.query.quality)
    ? parseInt(req.query.quality ?? '')
    : req.query.quality.length > 0
    ? parseInt(req.query.quality[0] ?? '')
    : Quality.Default;

  if (isNaN(quality)) quality = Quality.Default;

  const videoServer = !Array.isArray(req.query.videoServer)
    ? req.query.videoServer
    : req.query.videoServer.length > 0
    ? req.query.videoServer[0]
    : undefined;

  return getStream(req.query.videoId as string, quality, videoServer)
    .then((streamUrl) => res.status(307).redirect(encodeURI(streamUrl).replaceAll('%25', '%')))
    .catch((e) => res.status(500).send(e ?? 'Unexpected Error'));
};

export default getVideoUrl;
