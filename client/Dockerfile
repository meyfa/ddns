# check=skip=SecretsUsedInArgOrEnv

FROM node:22.21.1-alpine AS build
WORKDIR /app

COPY ./package*.json ./
COPY ./common/package*.json ./common/
COPY ./client/package*.json ./client/
RUN npm ci

COPY ./tsconfig.json ./
COPY ./common ./common
COPY ./client ./client
RUN npm run build

FROM node:22.21.1-alpine AS deploy
WORKDIR /app

RUN apk add --no-cache tini

COPY ./package*.json ./
COPY ./common/package*.json ./common/
COPY ./client/package*.json ./client/
RUN npm ci --omit=dev

COPY --from=build /app/common/dist ./common/dist
COPY --from=build /app/client/dist ./client/dist

USER node

ENV NODE_ENV=production

ENV DDNS_URL=''
ENV DDNS_SECRET=''
ENV DDNS_UPDATE_INTERVAL='300'
ENV DDNS_REQUEST_TIMEOUT='30'

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--enable-source-maps", "--disable-proto=delete", "client/dist/main.js"]
