FROM node:26.13.1-alpine
RUN apk add --no-cache font-dejavu
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY bot.js ./
COPY src/ ./src/
VOLUME /app/data
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.CONTROL_PORT || 3000) + '/health', { signal: AbortSignal.timeout(5000) }).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "bot.js"]
