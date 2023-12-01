import type { NextApiRequest, NextApiResponse } from 'next';

const redirectToVideo = (req: NextApiRequest, res: NextApiResponse) => {
  const videoId = !Array.isArray(req.query.v)
    ? req.query.v
    : req.query.v.length > 0
    ? req.query.v[0]
    : undefined;

  if (!videoId) return res.status(307).redirect('/');

  return res.status(307).redirect(`/videos/${videoId}`);
};

export default redirectToVideo;
