# syntax = docker/dockerfile:1

# Base Image
FROM platformatic/node-caged:26.1.0-slim AS base

LABEL fly_launch_runtime="Node.js"

# Declare args
ARG HOST=::
ARG PORT=3000

ARG APP_HOST=animes.garden
ARG FEED_HOST=api.animes.garden

ARG WEB_SERVER_URL=https://api.animes.garden/
ARG FEED_SERVER_URL=https://api.animes.garden/

ARG KEEPSHARE_ID=gv78k1oi
ARG UMAMI_HOST=umami.animes.garden
ARG UMAMI_ID=bcff225d-6590-498e-9b39-3a5fc5c2b4d1

# Set environment variables
ENV CI=true NODE_ENV="production" HOST=${HOST} PORT=${PORT} \
    APP_HOST=${APP_HOST} FEED_HOST=${FEED_HOST} \
    WEB_SERVER_URL=${WEB_SERVER_URL} FEED_SERVER_URL=${FEED_SERVER_URL} \
    KEEPSHARE_ID=${KEEPSHARE_ID} UMAMI_HOST=${UMAMI_HOST} UMAMI_ID=${UMAMI_ID}

# Node.js app lives here
WORKDIR /app

# Verify node pointer compression
RUN node -e "const v8 = require('node:v8'); const enabled = process.config.variables.v8_enable_pointer_compression; console.log('node', process.version, 'v8', process.versions.v8, 'heap_limit', v8.getHeapStatistics().heap_size_limit, 'pointer_compression', enabled); if (String(enabled) !== '1') process.exit(1);"

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
RUN pnpm run build:web && pnpm prune --prod


# Final stage for app image
FROM base

# Declare args
ARG HOST=::
ARG PORT=3000

# Copy built application
COPY --from=build /app /app

# Start the server by default, this can be overwritten at runtime
EXPOSE ${PORT}

CMD [ "node", "apps/web/server.mjs" ]
