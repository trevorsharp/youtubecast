FROM node:16-alpine

RUN apk add --no-cache yarn python3 py3-pip
RUN set -x && \
  wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/bin/yt-dlp && \
  chmod a+x /usr/bin/yt-dlp

WORKDIR /app

COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock
RUN yarn

COPY . .
RUN yarn build

CMD /usr/bin/yt-dlp -U && \
  /usr/bin/yt-dlp --version && \
  yarn start
