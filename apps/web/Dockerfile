# syntax = docker/dockerfile:1

ARG NODE_VERSION=24.3.0
ARG PNPM_VERSION=10.13.1

ARG APP_HOST=animes.garden
ARG FEED_HOST=api.animes.garden

ARG SERVER_URL=https://api.animes.garden/
ARG FEED_SERVER_URL=https://api.animes.garden/

ARG UMAMI_ID=bcff225d-6590-498e-9b39-3a5fc5c2b4d1

ARG PORT=3000

# Base Image
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Declare args
ARG APP_HOST FEED_HOST SERVER_URL FEED_SERVER_URL UMAMI_ID

# Set production environment or development for test
ENV NODE_ENV="development" APP_HOST=$APP_HOST FEED_HOST=$FEED_HOST SERVER_URL=$SERVER_URL FEED_SERVER_URL=$FEED_SERVER_URL UMAMI_ID=$UMAMI_ID

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

# Setup environment and Build application
RUN pnpm run build && pnpm run build:web

# Remove development dependencies
RUN pnpm prune --prod


# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

# Listen on 3000
ENV HOST=:: PORT=${PORT}

# Declare args
ARG APP_HOST FEED_HOST SERVER_URL FEED_SERVER_URL UMAMI_ID
ENV APP_HOST=$APP_HOST FEED_HOST=$FEED_HOST SERVER_URL=$SERVER_URL FEED_SERVER_URL=$FEED_SERVER_URL UMAMI_ID=$UMAMI_ID

# Start the server by default, this can be overwritten at runtime
EXPOSE ${PORT}

CMD [ "node", "apps/web/server.mjs" ]
