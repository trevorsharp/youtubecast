import { z } from 'zod';

export default z.object({
  type: z.literal('playlist'),
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().url(),
  link: z.string().url(),
});
