import { z } from 'zod';

export default z.object({
  type: z.literal('channel'),
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  imageUrl: z.string().url(),
  link: z.string().url(),
});
