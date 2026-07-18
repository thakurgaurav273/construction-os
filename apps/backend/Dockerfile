FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# Generate Prisma Client (needed before build)
RUN pnpm --filter=@sitepilot/backend run prisma:generate
RUN pnpm --filter=@sitepilot/backend build

FROM base AS runner
WORKDIR /app
# We need production dependencies only
COPY --from=builder /app /app
# Setting NODE_ENV to production isn't strictly necessary here if we rely on start script, but good practice
ENV NODE_ENV=production
ENV PORT=5174

EXPOSE 5174

WORKDIR /app/apps/backend
CMD ["node", "dist/main.js"]
