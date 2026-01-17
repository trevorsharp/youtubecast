FROM oven/bun:1-alpine AS base
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

RUN apk add --no-cache ffmpeg python3 py3-pip nginx
RUN set -x && \
  wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/bin/yt-dlp && \
  chmod a+x /usr/bin/yt-dlp

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production
COPY --from=build /static ./static
COPY ./src ./src

COPY nginx.conf /etc/nginx/nginx.conf

# Run application
EXPOSE 3000/tcp
CMD nginx && bun run start