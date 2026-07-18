FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache openssl

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# Next.js may need API URL at build time if it performs static generation. Since it relies on the backend, we usually mock or pass it.
RUN pnpm --filter=@sitepilot/frontend build

FROM base AS runner
WORKDIR /app
COPY --from=builder /app /app

ENV NODE_ENV=production
ENV PORT=5173

EXPOSE 5173

WORKDIR /app/apps/frontend
CMD ["pnpm", "start"]
