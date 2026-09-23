# Production image for the self-hosted deployment (Node adapter).
# Build:  docker compose -f docker-compose.prod.yml up -d --build

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# `site` is baked in at build time (feed links, sitemap, canonical URLs).
ARG PUBLIC_SITE_URL=http://localhost:4321
ENV ADAPTER=node PUBLIC_SITE_URL=$PUBLIC_SITE_URL
RUN pnpm exec astro build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
RUN corepack enable && corepack prepare pnpm@10 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
# Uploaded images and audio live on a volume mounted here.
RUN mkdir -p /data/uploads
EXPOSE 4321
CMD ["node", "dist/server/index.mjs"]
