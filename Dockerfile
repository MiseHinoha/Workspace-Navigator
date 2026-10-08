# Multi-stage build for production
FROM node:20-alpine AS builder

# Version metadata is injected at build time: the build context excludes .git,
# so `git describe` inside the image would otherwise fall back to package.json
# and every deployment would report version 1.0.0.
ARG APP_VERSION=
ARG APP_BUILD_ID=

# Set working directory
WORKDIR /app

# Copy package files
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd frontend && npm install
RUN cd backend && npm install

# Copy source code
COPY frontend/ ./frontend/
COPY backend/ ./backend/

# Build frontend
RUN cd frontend && VITE_APP_VERSION="$APP_VERSION" APP_BUILD_ID="$APP_BUILD_ID" npm run build

# Build backend
RUN cd backend && npm run build

# Production stage
FROM node:20-alpine AS production

# Install SQLite dependencies
RUN apk add --no-cache sqlite

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy built files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/frontend/dist ./public

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Start the server
CMD ["node", "dist/index.js"]
