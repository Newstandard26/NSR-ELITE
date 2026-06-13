# --- Build stage ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies (with dev deps for the build).
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Prisma needs the schema before generate (run via postinstall + build).
COPY prisma ./prisma
COPY . .

# Generate the Prisma client and build Next.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy the built app and production deps.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Apply migrations then start. (Use `prisma migrate deploy` against your DB.)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
