import type { ZodError } from 'zod';

export default (error: ZodError) =>
  error.errors.forEach((e) => {
    console.error(e.path.join(' '), ':', e.message);
  });
