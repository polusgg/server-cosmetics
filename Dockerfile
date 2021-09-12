FROM node:16.9-alpine3.13

WORKDIR /usr/src/server-cosmetics

ARG NPM_AUTH_TOKEN

EXPOSE 2219/tcp

ENV NODE_ENV=production

ENV DATABASE_URL \
    CA_CERT_PATH \
    STEAM_PUBLISHER_KEY \
    ACCOUNT_AUTH_TOKEN

COPY --chown=node:node .npmrc_docker \
                       ./.npmrc
COPY --chown=node:node package.json \
                       package-lock.json \
                       tsconfig.json \
                       ./

RUN ["npm", "ci"]

COPY --chown=node:node . \
                       ./

RUN ["npm", "run", "build"]

USER node

ENTRYPOINT ["npm", "run", "start:prod"]
