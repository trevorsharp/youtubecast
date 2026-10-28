FROM node:24.22.1-alpine AS node

FROM oven/bun:1.4.4-alpine AS base
WORKDIR /app

# Build static UI
FROM base AS build

COPY ui/package.json ui/bun.lock ./
RUN bun install --frozen-lockfile
COPY ./ui .
ENV NODE_ENV=production
RUN bun run build

# Compose release container
FROM base AS release

COPY --from=node /usr/local/bin/node /usr/local/bin/node
RUN apk add --no-cache ffmpeg python3 py3-pip nginx libatomic libstdc++ && node --version
RUN set -x && \
  wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/bin/yt-dlp && \
  chmod a+x /usr/bin/yt-dlp

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /static ./static
COPY ./src ./src

COPY nginx.conf /etc/nginx/nginx.conf

# Run application
EXPOSE 3000/tcp
CMD nginx && bun run start
