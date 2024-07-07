FROM node:lts

WORKDIR /app

COPY ./package.json ./package.json
RUN npm install

ENV SKIP_ENV_VALIDATION=true

COPY . .
RUN npm run build

CMD ["npm", "run", "start"]
