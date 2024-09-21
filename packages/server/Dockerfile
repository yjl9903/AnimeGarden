# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=20.10.0
ARG PNPM_VERSION=9.10.0


# Base Image
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Install pnpm
RUN npm install -g pnpm@$PNPM_VERSION


# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 git

# Install node modules
COPY --link package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json .npmrc .node-version ./
COPY ./packages/animegarden/package.json ./packages/animegarden/
COPY ./packages/app/package.json ./packages/app/
COPY ./packages/cli/package.json ./packages/cli/
COPY ./packages/database/package.json ./packages/database/
COPY ./packages/scraper/package.json ./packages/scraper/
COPY ./packages/server/package.json ./packages/server/
COPY ./packages/worker/package.json ./packages/worker/
# COPY ./apps/frontend/web/package.json ./apps/frontend/web/
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

# Listen on 3000
ENV HOST=0.0.0.0 PORT=3000

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000

CMD [ "node", "packages/server/dist/index.mjs" ]
