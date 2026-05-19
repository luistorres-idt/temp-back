# Backend — Proyecto Temp

API REST construida con Node.js, Express, TypeScript y Prisma ORM (MySQL).

## Stack

- **Runtime**: Node.js 22 + TypeScript
- **Framework**: Express
- **ORM**: Prisma (cliente generado en `src/generated/prisma/`)
- **Base de datos**: MySQL 8.0
- **Package manager**: pnpm

---

## Estructura relevante

```
backend/
├── src/
│   ├── app.ts              # Entrypoint principal
│   ├── generated/prisma/   # Cliente Prisma (generado, no editar)
│   └── config/
│       └── db.ts           # Instancia del PrismaClient
├── prisma/
│   ├── schema.prisma       # Definición del esquema de la DB
│   ├── migrations/         # Historial de migraciones SQL
│   └── seed.ts             # Datos iniciales (módulos, permisos, admin)
├── dist/                   # Código compilado (generado por tsc, ignorado en git)
├── Dockerfile              # Imagen de producción (multi-stage build)
├── docker-compose.yml      # Compose solo para desarrollo local
├── entrypoint.sh           # Script de arranque en producción
├── .dockerignore           # Archivos excluidos del contexto de build
└── example.env             # Plantilla de variables de entorno
```

---

## Desarrollo local

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp example.env .env
```

Edita `.env` con tus valores:

```env
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=tu_password
DATABASE_NAME=temp
DATABASE_URL="mysql://root:tu_password@localhost:3306/temp"

PORT=3000
TOKEN_SECRET_KEY="una_clave_larga_y_aleatoria"
TOKEN_ACCESS_TIME="8h"
TOKEN_REFRESH_TIME="7d"
```

### 3. Generar el cliente de Prisma

```bash
npx prisma generate
```

Esto genera el cliente tipado en `src/generated/prisma/`. Debes correrlo siempre que modifiques `schema.prisma`.

### 4. Aplicar migraciones y sembrar la base de datos

```bash
# Aplica las migraciones pendientes (crea las tablas)
npx prisma migrate dev

# Puebla la DB con datos iniciales (módulos, permisos, perfil admin)
npx prisma db seed
```

### 5. Levantar el servidor

```bash
pnpm run dev
```

El servidor arranca en `http://localhost:3000`. Endpoint de salud: `GET /api/health`.

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `pnpm run dev` | Servidor con hot-reload via `tsx watch` |
| `pnpm run build` | Compila TypeScript a `dist/` |
| `pnpm run start` | Lanza `node dist/app.js` (producción sin Docker) |
| `pnpm run test` | Corre los tests con Vitest |
| `pnpm run test:watch` | Tests en modo watch |
| `pnpm run test:coverage` | Tests con reporte de cobertura |

---

## Archivos Docker

### `Dockerfile` (multi-stage build)

Construye una imagen de producción optimizada en 5 etapas:

| Stage | Propósito |
|---|---|
| `base` | Node 22 Alpine + pnpm + OpenSSL (requerido por Prisma en Alpine) |
| `dependencies` | `pnpm install` con todas las dependencias (dev + prod) |
| `builder` | `prisma generate` + `tsc` — genera `dist/` |
| `prod-dependencies` | `pnpm install --prod` solo dependencias de producción |
| `runner` | Imagen final: solo `dist/`, `node_modules` de prod, `prisma/`, `entrypoint.sh` |

La imagen final corre con el usuario `node` (sin privilegios) y expone el puerto `3000`.

### `entrypoint.sh`

Script de arranque que se ejecuta dentro del contenedor al iniciar:

1. Corre `prisma migrate deploy` para aplicar migraciones pendientes
2. Si detecta error `P3005` (DB existente sin historial Prisma), hace baseline automático de todas las migraciones y reintenta
3. Ejecuta `prisma/seed.ts` con `tsx`
4. Lanza `node dist/app.js`

### `docker-compose.yml`

Solo para desarrollo local — levanta únicamente el servicio `api` en `:3000` usando el `Dockerfile`. No incluye MySQL ni Nginx (asume que tienes MySQL corriendo en tu máquina).

```bash
docker compose up -d --build
```

### `.dockerignore`

Excluye del contexto de build: `node_modules/`, `dist/`, `.env`, logs, `.git`, `.vscode`.

---

## Producción (EC2)

El despliegue en producción se maneja desde la carpeta `deploy/` en la raíz del proyecto. Ver [`deploy/README.md`](deploy/README.md) para el proceso completo.

En producción:
- La imagen se construye via `docker-compose.prod.yml` usando este `Dockerfile`
- Las variables de entorno de la DB son inyectadas por el compose (sobreescriben el `.env`)
- `entrypoint.sh` gestiona las migraciones automáticamente al arrancar
- El backend solo es accesible internamente vía Nginx (no expuesto directo al exterior)
