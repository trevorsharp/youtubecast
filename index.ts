const UI_FILE_PATH = './static';
const CONTENT_FILE_PATH = './content';

const server = Bun.serve({
  port: 3000,
  fetch: async (req) => {
    const { pathname } = new URL(req.url);

    if (pathname.match(/^\/content\/[^\/]*$/i)) {
      const contentFileName = pathname.replace(/^\/content\//i, '');
      const contentFile = Bun.file(`${CONTENT_FILE_PATH}/${contentFileName}`);
      return new Response(contentFile);
    }

    if (pathname.match(/^\/assets\/.*/i)) {
      const assetsFile = Bun.file(`${UI_FILE_PATH}${pathname}`);
      return new Response(assetsFile);
    }

    return new Response(Bun.file(`${UI_FILE_PATH}/index.html`));
  },
  error: (error) => {
    if (error.errno === -2) {
      return new Response('Not Found', { status: 404 });
    }

    console.error('HTTP Server Error -', error.message);
    return new Response('Server Error', { status: 500 });
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);
