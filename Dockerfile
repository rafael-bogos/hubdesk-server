# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:22-alpine AS production
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/infrastructure/database/prisma/schema.prisma ./src/infrastructure/database/prisma/schema.prisma
COPY --from=builder /app/src/infrastructure/database/prisma/migrations ./src/infrastructure/database/prisma/migrations

RUN addgroup -S app && adduser -S app -G app
RUN mkdir -p /app/uploads && chown -R app:app /app/uploads
USER app

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
# Aplica migrations pendentes e roda o seed do admin (idempotente — só cria se
# não existir nenhum ADMIN) antes de subir o servidor, para que `docker compose up`
# funcione sozinho, sem passo manual.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/infrastructure/database/prisma/seed.js && exec node dist/main/server.js"]
