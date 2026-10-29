# Multi-stage production Dockerfile for SMANTRI ASESMEN Full-Stack Deployment
# Compatible with GitHub Actions, Render, Railway, CapRover, Coolify, VPS, and any custom domain hosting

FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for maximum Docker caching
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build Vite frontend
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built frontend dist and backend server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/data ./data

# Expose standard port
EXPOSE 3000

# Start server using tsx
CMD ["npx", "tsx", "server.ts"]
