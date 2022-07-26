/**
 * Don't be scared of the generics here.
 * All they do is to give us autocompletion when using this.
 *
 * @template {import('next').NextConfig} T
 * @param {T} config - A generic parameter that flows through to the return type
 * @constraint {{import('next').NextConfig}}
 */
function defineNextConfig(config) {
  return config;
}

export default defineNextConfig({
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/channel/:channelId',
          destination: '/:channelId',
        },
        {
          source: '/c/:channelName',
          destination: '/:channelName',
        },
        {
          source: '/playlist',
          has: [
            {
              type: 'query',
              key: 'list',
              value: '(?<playlistId>.*)',
            },
          ],
          destination: '/:playlistId',
        },
        {
          source: '/feed/:id',
          destination: '/api/feed/:id',
        },
        {
          source: '/watch',
          destination: '/api/videos',
        },
      ],
    };
  },
});
