# Multi-stage production Docker build for Floaty Shooter
# Lightweight, secure, non-root, sub-100MB container

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV CLUSTER=true

# Copy application files
COPY package*.json ./
COPY server.js ./
COPY index.html ./
COPY style.css ./
COPY game.js ./
COPY data.js ./
COPY store.js ./
COPY daily_reward.js ./
COPY admob-manager.js ./
COPY manifest.json ./
COPY service-worker.js ./
COPY icon.png ./
COPY favicon.ico ./
COPY image/ ./image/
COPY music/ ./music/
COPY video/ ./video/
COPY data/ ./data/

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
