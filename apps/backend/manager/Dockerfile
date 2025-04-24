# syntax = docker/dockerfile:1

ARG NODE_VERSION=20.19.0
ARG PNPM_VERSION=10.9.0

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
COPY ./packages/app/package.json ./packages/app/
COPY ./packages/client/package.json ./packages/client/
COPY ./packages/scraper/package.json ./packages/scraper/
COPY ./packages/shared/package.json ./packages/shared/
COPY ./apps/backend/database/package.json ./apps/backend/database/
COPY ./apps/backend/server/package.json ./apps/backend/server/
COPY ./apps/backend/manager/package.json ./apps/backend/manager/
COPY ./apps/frontend/web/package.json ./apps/frontend/web/
COPY ./apps/frontend/worker/package.json ./apps/frontend/worker/

RUN pnpm install --frozen-lockfile --prod=false

# Copy application code
COPY --link . .

# Setup environment and Build application
RUN pnpm run build && pnpm run build:server

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

CMD [ "node", "apps/backend/manager/cli.mjs", "start" ]
