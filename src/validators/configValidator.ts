import { z } from 'zod';

export default z.object({
  youtubeApiKey: z.string().min(1, 'YouTube API Key must be provided'),
  downloadVideos: z.boolean(),
});
