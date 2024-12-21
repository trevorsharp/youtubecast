FROM oven/bun:1.1-alpine AS base
WORKDIR /app

# Build static UI
FROM base AS build

COPY ui/package.json ui/bun.lockb ./
RUN bun install --frozen-lockfile
COPY ./ui .
ENV NODE_ENV=production
RUN bun run build

# Compose release container
FROM base AS release

RUN apk add --no-cache python3 py3-pip
RUN set -x && \
  wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/bin/yt-dlp && \
  chmod a+x /usr/bin/yt-dlp

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production
COPY --from=build /static ./static
COPY ./src ./src

# Run application
USER bun
EXPOSE 3000/tcp
CMD /usr/bin/yt-dlp -U && bun run start