# syntax = docker/dockerfile:1

ARG NODE_VERSION=26.1.0

# Base Image
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

ARG APP_HOST=animes.garden
ARG FEED_HOST=api.animes.garden

ARG HOST=0.0.0.0
ARG PORT=3000

# Set environment variables
ENV CI=true NODE_ENV="production" \
    HOST=${HOST} PORT=${PORT} \
    APP_HOST=${APP_HOST} FEED_HOST=${FEED_HOST}

# Node.js app lives here
WORKDIR /app    

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 git

# Install node modules
COPY --link package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json .node-version ./
COPY ./patches/ ./patches/
COPY ./packages/anipar/package.json ./packages/anipar/
COPY ./packages/client/package.json ./packages/client/
COPY ./packages/scraper/package.json ./packages/scraper/
COPY ./packages/shared/package.json ./packages/shared/
COPY ./apps/server/package.json ./apps/server/
COPY ./apps/web/package.json ./apps/web/
COPY ./apps/worker/package.json ./apps/worker/

# Install the package manager version declared by the workspace root.
RUN npm install -g $(node -p "require('./package.json').packageManager")

RUN pnpm install --frozen-lockfile --prod=false

# Copy application code
COPY --link . .

# Build application and remove development dependencies
RUN pnpm run build:server && pnpm prune --prod


# Final stage for app image
FROM base

# Declare args
ARG HOST=0.0.0.0
ARG PORT=3000

ARG KEEPSHARE_ID=gv78k1oi
ARG TELEGRAM_TOKEN
ARG TELEGRAM_CHAT_ID

# Set environment variables
ENV HOST=${HOST} PORT=${PORT} \
    KEEPSHARE_ID=${KEEPSHARE_ID} \
    TELEGRAM_TOKEN=${TELEGRAM_TOKEN} TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE ${PORT}

CMD [ "node", "apps/server/cli.mjs", "start" ]
