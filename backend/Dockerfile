FROM node:20-alpine AS builder

WORKDIR /app

# Copy package info and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build TypeScript to dist/
RUN npm run build

# Stage 2: Production environment
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist
# Note: we will mount the data directory as a volume via docker-compose, but we copy it just in case
COPY --from=builder /app/data ./data

EXPOSE 3001
# Bypass NPM execution overhead, but rely on container bounds for memory
CMD ["node", "dist/infrastructure/server.js"]
