import { z } from 'zod';

export default z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  duration: z.number().min(0),
  date: z.string().datetime(),
  link: z.string().url(),
});
