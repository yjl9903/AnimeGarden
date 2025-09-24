# syntax = docker/dockerfile:1

ARG NODE_VERSION=24.8.0
ARG PNPM_VERSION=10.17.1

ARG APP_HOST=animes.garden
ARG FEED_HOST=api.animes.garden

ARG PORT=3000

# Base Image
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Install pnpm
RUN npm install -g pnpm@$PNPM_VERSION


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 git

# Install node modules
COPY --link package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json .npmrc .node-version ./
COPY ./patches/ ./patches/
COPY ./packages/animegarden/package.json ./packages/animegarden/
COPY ./packages/anipar/package.json ./packages/anipar/
COPY ./packages/client/package.json ./packages/client/
COPY ./packages/scraper/package.json ./packages/scraper/
COPY ./packages/shared/package.json ./packages/shared/
COPY ./apps/server/package.json ./apps/server/
COPY ./apps/web/package.json ./apps/web/
COPY ./apps/worker/package.json ./apps/worker/

RUN pnpm install --frozen-lockfile --prod=false

# Copy application code
COPY --link . .

# Setup CI environment
ENV CI=true

# Build application
RUN pnpm run build:server

# Remove development dependencies
RUN pnpm prune --prod


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Declare args
ARG PORT APP_HOST FEED_HOST
ENV HOST=:: PORT=${PORT} APP_HOST=${APP_HOST} FEED_HOST=${FEED_HOST}

# Start the server by default, this can be overwritten at runtime
EXPOSE ${PORT}

CMD [ "node", "apps/server/cli.mjs", "start" ]
