# --- Stage 1: Builder ---
FROM node:18-alpine AS builder
WORKDIR /app

# Accept build argument
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: Runner ---
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# HAPUS baris COPY --from=builder /app/public ./public 
# Karena folder public tidak ada di source code Anda, baris ini menyebabkan error.

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]