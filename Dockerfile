FROM node:15.12.0-alpine3.13

WORKDIR /usr/src/server-cosmetics

ARG NPM_AUTH_TOKEN

EXPOSE 2219/tcp

ENV NODE_ENV=production

ENV DATABASE_URL \
    DATABASE_NAME \
    STEAM_PUBLISHER_KEY \
    ACCOUNT_AUTH_TOKEN

COPY --chown=node:node .npmrc_docker \
                       ./.npmrc
COPY --chown=node:node package.json \
                       package-lock.json \
                       tsconfig.json \
                       ./

COPY --chown=node:node ./dist \
                       ./dist/

RUN ["npm", "ci"]

USER node

ENTRYPOINT ["npm", "run", "run:prod"]
