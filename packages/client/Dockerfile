# Build context: repo root
# syntax=docker/dockerfile:1.7
#
# Produces a minimal static-file container for the Vite build output. The
# gateway Caddy in front of this container handles TLS, prefix stripping, and
# reverse-proxying socket.io — this image only serves /srv on port 80.

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS builder
# Base path the app is mounted at in production (e.g. /emblem/). Must match
# the gateway route so asset URLs in index.html line up.
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=$VITE_BASE_PATH
# Socket.io endpoint path (e.g. /emblem/socket.io/ behind a gateway).
ARG VITE_SOCKET_PATH=/socket.io/
ENV VITE_SOCKET_PATH=$VITE_SOCKET_PATH
# Leave empty in production → client uses window.location.origin.
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
RUN pnpm exec turbo run build --filter=@cards/client

FROM caddy:2.8-alpine AS runtime
COPY --from=builder /repo/packages/client/dist /srv
COPY packages/client/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
# Healthcheck for observability + `docker compose up` startup gating.
# busybox wget has `--spider` (HEAD-equivalent, exits non-zero on 4xx/5xx)
# and `-T` for timeout; `--tries` is NOT supported by busybox, so avoid it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider -q -T 3 http://127.0.0.1/ || exit 1
