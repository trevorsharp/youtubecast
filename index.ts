const server = Bun.serve({
  port: 3000,
  static: {
    '/': new Response(await Bun.file('./ui/dist/index.html').bytes(), {
      headers: {
        'Content-Type': 'text/html',
      },
    }),
  },
  fetch: async (req) => {
    const { pathname } = new URL(req.url);

    if (pathname.startsWith('/assets')) {
      const assetsFile = Bun.file(`./ui/dist${pathname}`);
      return new Response(assetsFile);
    }

    return new Response('404!');
  },
});

console.log(`Listening on http://localhost:${server.port} ...`);
