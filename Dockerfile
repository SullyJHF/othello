# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Build arguments for version information
ARG REACT_APP_VERSION
ARG REACT_APP_BUILD_HASH
ARG REACT_APP_BUILD_BRANCH
ARG REACT_APP_BUILD_TIME

# Set environment variables from build arguments
ENV REACT_APP_VERSION=${REACT_APP_VERSION}
ENV REACT_APP_BUILD_HASH=${REACT_APP_BUILD_HASH}
ENV REACT_APP_BUILD_BRANCH=${REACT_APP_BUILD_BRANCH}
ENV REACT_APP_BUILD_TIME=${REACT_APP_BUILD_TIME}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S othello -u 1001

# Change ownership of the app directory
RUN chown -R othello:nodejs /app
USER othello

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "run", "serve"]