FROM node:16-alpine

RUN apk add --no-cache yarn git

WORKDIR /app

COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock
RUN yarn

COPY . .
ENV SKIP_ENV_VALIDATION=1
RUN yarn build

CMD yarn start
