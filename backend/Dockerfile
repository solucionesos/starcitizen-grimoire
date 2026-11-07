FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

# Copy package info and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build TypeScript to dist/
RUN npm run build

# Stage 2: Production environment
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist
# Keep a reference copy of bundled data outside the /app/data volume mount so db.json can auto-upgrade on container rebuild
COPY --from=builder /app/data ./bundled_data
COPY --from=builder /app/data ./data

EXPOSE 3001
# Bypass NPM execution overhead, but rely on container bounds for memory
CMD ["node", "dist/infrastructure/server.js"]
