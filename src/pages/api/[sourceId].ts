import type { NextApiRequest, NextApiResponse } from 'next';
import { getRssFeed } from '../../services/feedService';
import { Quality } from '../../types';

const getRssFeedForSource = async (req: NextApiRequest, res: NextApiResponse<string>) => {
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

  return getRssFeed(req.query.sourceId as string, req.headers.host ?? '', quality, videoServer)
    .then((rssFeed) => res.status(200).send(rssFeed))
    .catch((e) => res.status(500).send(e ?? 'Unexpected Error'));
};

export default getRssFeedForSource;
