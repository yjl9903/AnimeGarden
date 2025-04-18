# syntax = docker/dockerfile:1

ARG NODE_VERSION=20.19.0
ARG PNPM_VERSION=10.8.0

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
COPY ./packages/app/package.json ./packages/app/
COPY ./packages/scraper/package.json ./packages/scraper/
COPY ./packages/worker/package.json ./packages/worker/
COPY ./apps/backend/database/package.json ./apps/backend/database/
COPY ./apps/backend/server/package.json ./apps/backend/server/
COPY ./apps/backend/manager/package.json ./apps/backend/manager/
COPY ./apps/frontend/web/package.json ./apps/frontend/web/

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

CMD [ "node", "apps/frontend/web/server.mjs" ]
