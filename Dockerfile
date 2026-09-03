# Solingo platform — multi-stage build, runs Next.js standalone on Node 22.
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# drizzle-kit + seed need the source tree; keep the bits they use
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/db ./db
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/content ./content
COPY --from=build /app/constants.ts /app/drizzle.config.ts /app/tsconfig.json ./
EXPOSE 3000
CMD ["node", "server.js"]
