# Build context: repo root
# syntax=docker/dockerfile:1.7

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS builder
ARG VITE_SERVER_URL=""
ENV VITE_SERVER_URL=$VITE_SERVER_URL
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/card-engine/package.json packages/card-engine/
COPY packages/battle-engine/package.json packages/battle-engine/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY packages/card-engine packages/card-engine
COPY packages/battle-engine packages/battle-engine
COPY packages/client packages/client
RUN pnpm --filter @cards/client... build

FROM caddy:2-alpine AS runtime
COPY --from=builder /repo/packages/client/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
