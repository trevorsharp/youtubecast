FROM oven/bun:latest AS base
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

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production
COPY --from=build /static ./static
COPY index.ts .

# Run application
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "start" ]