# Multi-stage production Dockerfile for TroupeDev Frontend
# Stage 1: Build the React application in production mode
FROM node:18-alpine AS builder

ARG REACT_APP_API_URL
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_STRIPE_PUBLISHABLE_KEY 

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_STRIPE_PUBLISHABLE_KEY=$REACT_APP_STRIPE_PUBLISHABLE_KEY
# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies (production + dev dependencies needed for build)
RUN npm ci --silent

# Copy source code
COPY . .

# Copy .env file(s) to ensure they're available for build
COPY .env* ./

# Install dotenv-cli to load .env during build
RUN npm install --save-dev dotenv-cli

# Build the React application in production mode with .env loaded
# This runs webpack in production mode, creating optimized bundles
RUN npx dotenv -e .env -- npm run build

# Stage 2: Serve the built application with nginx
FROM nginx:alpine

# Remove default nginx configuration
RUN rm /etc/nginx/nginx.conf

# Copy custom nginx configuration from nginx folder
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy built React app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create nginx cache and log directories with proper permissions
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/log/nginx

# Create a simple error page for 50x errors
RUN echo '<html><head><title>Server Error</title></head><body><h1>Service Temporarily Unavailable</h1><p>Please try again later.</p></body></html>' > /usr/share/nginx/html/50x.html

# Expose port 80
EXPOSE 80

# Health check using the /health endpoint defined in nginx.conf
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]