FROM node:16-alpine

RUN apk add --no-cache yarn python3 py3-pip
RUN pip install pytube

WORKDIR /app

COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock
RUN yarn

COPY . .
RUN yarn build

COPY ./getStreamLink.py ./getStreamLink.py

CMD pip install pytube && \
  yarn start
