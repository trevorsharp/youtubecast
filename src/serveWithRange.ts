import type { Server } from 'bun';
import { stat } from 'fs/promises';

export default async (filePath: string, request: Request, server: Server) => {
  const file = Bun.file(filePath);
  const fileExists = await file.exists();

  if (!fileExists) {
    return undefined;
  }

  server.timeout(request, 600);

  const rangeHeader = request.headers.get('range');

  if (!rangeHeader) {
    return new Response(file, { headers: { 'Accept-Ranges': 'bytes' } });
  }

  const fileSize = await stat(filePath).then((stats) => stats.size);
  const [start, end] = rangeHeader
    .replace('bytes=', '')
    .split('-')
    .map((str) => parseInt(str));

  const contentLength = end - start + 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize || end >= fileSize) {
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${fileSize}`,
      },
    });
  }

  return new Response(file.slice(start, end), {
    status: 206,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': `${contentLength}`,
    },
  });
};
