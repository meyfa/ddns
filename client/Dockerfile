# check=skip=SecretsUsedInArgOrEnv

FROM node:20.18.1-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20.18.1-alpine AS deploy
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && apk add --no-cache tini

COPY --from=build /app/dist ./dist

USER node

ENV NODE_ENV=production

ENV DDNS_URL=''
ENV DDNS_SECRET=''
ENV DDNS_UPDATE_INTERVAL='300'
ENV DDNS_REQUEST_TIMEOUT='30'

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--enable-source-maps", "dist/main.js"]
