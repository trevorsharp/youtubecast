FROM node:16-alpine

RUN apk add --no-cache yarn

WORKDIR /app

COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock
RUN yarn

COPY . .
RUN yarn build

CMD yarn start
