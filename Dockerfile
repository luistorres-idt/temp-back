# === Stage 1: Base ===
FROM node:22-alpine AS base

# Dependencia recomendada para Prisma en Alpine
RUN apk add --no-cache openssl

# Configurar pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Variable de entorno ficticia para que prisma generate no falle en compilación
ENV DATABASE_URL="mysql://dummy:dummy@localhost:3306/dummy"

# Hacer hoisting de prisma para resolver el error de pnpm con custom output path
RUN echo "public-hoist-pattern[]=*prisma*" > .npmrc

# === Stage 2: Dependencies ===
FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# === Stage 3: Builder ===
FROM base AS builder
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules

# Generar el cliente de Prisma
RUN pnpm prisma generate
# Compilar el proyecto TypeScript
RUN pnpm run build

# === Stage 4: Production Dependencies ===
FROM base AS prod-dependencies
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Instalar solo las dependencias de produccion
RUN pnpm install --frozen-lockfile --prod
# Generar el cliente de Prisma usando dlx ya que prisma es devDependency
RUN npx prisma generate

# === Stage 5: Runner ===
FROM base AS runner

# Establecer entorno de produccion
ENV NODE_ENV=production

WORKDIR /app

# Copiar archivos necesarios desde las etapas anteriores
COPY package.json ./
COPY --from=prod-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# Copiar el cliente de prisma generado (incluyendo el motor binario que tsc ignora)
COPY --from=prod-dependencies /app/src/generated/prisma ./dist/generated/prisma
# Necesario para que tsx resuelva el import de seed.ts -> ../src/config/db
COPY --from=builder /app/src ./src

# Copiar y preparar el entrypoint
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

# Usar el usuario sin privilegios 'node' incluido por defecto para seguridad
USER node

# Exponer el puerto del backend (ajustar segun el valor en tu .env si es necesario)
EXPOSE 3000

CMD ["./entrypoint.sh"]
