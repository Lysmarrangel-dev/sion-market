# Build from the repo root: docker build -f apps/backend/Dockerfile -t sionmarket-backend .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter=@sionmarket/backend...
RUN pnpm turbo run build --filter=@sionmarket/backend...
RUN pnpm --filter=@sionmarket/backend deploy --legacy --prod /out

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/v1/salud || exit 1
# Same image runs every process: api (default), migrations (node dist/db/migrate.js), realtime (node dist/main-realtime.js) and worker (node dist/main-worker.js).
CMD ["node", "dist/main-api.js"]
