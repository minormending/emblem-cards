# Build context: repo root
# syntax=docker/dockerfile:1.7

FROM node:22.11-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS builder
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
COPY packages/server packages/server
RUN pnpm exec turbo run build --filter=@cards/server
RUN pnpm --filter=@cards/server deploy --prod /out

FROM node:22.11-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=builder --chown=node:node /out ./
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
