# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --production

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy installed dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY package.json ./
COPY index.js ./

# Server configuration
# PORT: 3003
EXPOSE 4000

# Set default port (can be overridden with BRIDGE_PORT env var)
ENV BRIDGE_PORT=4000

CMD ["node", "index.js"]
