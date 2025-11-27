FROM node:24-slim

# Install chromium for puppeteer (required by whatsapp-web.js)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell puppeteer to use installed chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source
COPY bot.js ./
COPY src/ ./src/

# Create volume mount points for persistent data
VOLUME /app/.wwebjs_auth
VOLUME /app/data

CMD ["node", "bot.js"]
