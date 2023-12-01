/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import('./src/env.mjs');

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/:path/feed',
          destination: '/api/:path',
        },
        {
          source: '/videos/:path*',
          destination: '/api/videos/:path*',
        },
        {
          source: '/watch',
          destination: '/api/watch',
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  /**
   * If you have `experimental: { appDir: true }` set, then you must comment the below `i18n` config
   * out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  // i18n: {
  //   locales: ['en'],
  //   defaultLocale: 'en',
  // },
};

export default config;
