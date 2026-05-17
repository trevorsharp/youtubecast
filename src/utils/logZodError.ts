import type { ZodError } from 'zod';

export default (error: ZodError) =>
  error.issues.forEach((e) => {
    console.error(e.path.join(' '), ':', e.message);
  });
