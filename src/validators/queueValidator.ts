import { z } from 'zod';

export default z.array(
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
  }),
);
