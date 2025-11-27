FROM node:22-alpine

# Install chromium for puppeteer (required by whatsapp-web.js)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell puppeteer to use installed chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source
COPY bot.js ./
COPY src/ ./src/

# Create volume mount point for WhatsApp session
VOLUME /app/.wwebjs_auth

CMD ["node", "bot.js"]
