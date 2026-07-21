FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache openssl

FROM base AS builder
WORKDIR /app
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm install --frozen-lockfile
# Next.js may need API URL at build time if it performs static generation. Since it relies on the backend, we usually mock or pass it.
RUN pnpm --filter=@sitepilot/frontend build
# Strip dev dependencies before the runner copies the tree. `next`, `react` and the
# workspace UI packages are runtime dependencies, so `next start` still resolves.
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

FROM base AS runner
WORKDIR /app
COPY --from=builder /app /app

ENV NODE_ENV=production
ENV PORT=5173

EXPOSE 5173

WORKDIR /app/apps/frontend
CMD ["pnpm", "start"]
