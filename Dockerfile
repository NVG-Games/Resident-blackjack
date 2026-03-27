# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Accept PeerJS config as build args; default empty = use public PeerJS cloud
ARG VITE_PEER_HOST=""
ARG VITE_PEER_PORT="9000"
ARG VITE_PEER_PATH="/"

# Expose to Vite at build time
ENV VITE_PEER_HOST=$VITE_PEER_HOST \
    VITE_PEER_PORT=$VITE_PEER_PORT \
    VITE_PEER_PATH=$VITE_PEER_PATH

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json package-lock.json ./

RUN npm ci --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
