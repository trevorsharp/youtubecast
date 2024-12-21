import { z } from 'zod';

export default z.object({
  youtubeApiKey: z.string().min(1, 'YouTube API Key must be provided'),
  maxVideoQuality: z.union([z.literal('720p'), z.literal('1080p')], { message: 'Must be either "720p" or "1080p"' }),
});
