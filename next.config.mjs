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
          source: '/:sourceId/feed',
          destination: '/api/:sourceId',
        },
        {
          source: '/watch',
          has: [
            {
              type: 'query',
              key: 'v',
              value: '(?<videoId>.*)',
            },
          ],
          destination: '/api/videos/:videoId',
        },
      ],
    };
  },
  async redirects() {
    return [
      {
        source: '/channel/:channelId',
        destination: '/:channelId',
        permanent: false,
      },
      {
        source: '/c/:channelName',
        destination: '/:channelName',
        permanent: false,
      },
      {
        source: '/user/:channelName',
        destination: '/:channelName',
        permanent: false,
      },
      {
        source: '/channel/:channelId/videos',
        destination: '/:channelId',
        permanent: false,
      },
      {
        source: '/c/:channelName/videos',
        destination: '/:channelName',
        permanent: false,
      },
      {
        source: '/user/:channelName/videos',
        destination: '/:channelName',
        permanent: false,
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
        destination: '/:playlistId?',
        permanent: false,
      },
    ];
  },
});
