# Simple Dockerfile for Book Shop API Development
FROM node:20-alpine

# Install only essential tools for database connectivity
RUN apk add --no-cache \
    postgresql-client \
    redis \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and setup script
COPY . .

# Fix line endings and make script executable
RUN apk add --no-cache dos2unix \
    && dos2unix scripts/docker-start.sh \
    && chmod +x scripts/docker-start.sh \
    && ls -la scripts/

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "docker:start"]

