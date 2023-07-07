import type { NextApiRequest, NextApiResponse } from 'next';
import { getRssFeed } from '~/services/feedService';
import { Quality } from '~/types';

const getRssFeedForSource = async (req: NextApiRequest, res: NextApiResponse<string>) => {
  let quality = !Array.isArray(req.query.quality)
    ? parseInt(req.query.quality ?? '')
    : req.query.quality.length > 0
    ? parseInt(req.query.quality[0] ?? '')
    : Quality.Default;

  if (isNaN(quality)) quality = Quality.Default;

  const excludeShorts = req.query.excludeShorts !== undefined;

  const videoServer = !Array.isArray(req.query.videoServer)
    ? req.query.videoServer
    : req.query.videoServer.length > 0
    ? req.query.videoServer[0]
    : undefined;

  res.setHeader('Cache-Control', 's-maxage=1200');
  return getRssFeed(
    req.query.sourceId as string,
    req.headers.host ?? '',
    quality,
    excludeShorts,
    videoServer
  )
    .then((rssFeed) => res.status(200).send(rssFeed))
    .catch((errorMessage: string) => res.status(500).send(errorMessage ?? 'Unexpected Error'));
};

export default getRssFeedForSource;
