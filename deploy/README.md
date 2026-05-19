# Despliegue en EC2 — Proyecto Temp

Esta carpeta contiene toda la infraestructura necesaria para correr el proyecto en producción sobre una instancia EC2 de AWS (single-node). El stack completo es:

- **Frontend**: Vue 3 + Vite → compilado como estáticos, servido por Nginx
- **Backend**: Node.js + Express + TypeScript + Prisma ORM (MySQL)
- **Base de datos**: MySQL 8.0 en contenedor Docker con volumen persistente
- **Reverse proxy**: Nginx — sirve el frontend y redirige `/api/` y `/socket.io/` al backend

---

## Estructura de esta carpeta

```
deploy/
├── docker-compose.prod.yml   # Orquesta los 3 servicios en producción
├── nginx/
│   └── nginx.conf            # Config de Nginx: estáticos + proxy al backend + WebSockets
├── init-server.sh            # Script de setup inicial del EC2 (Docker + Swap)
└── README.md                 # Este archivo
```

---

## Arquitectura en producción

```mermaid
flowchart TB
    Internet(["Internet"])

    subgraph EC2["EC2 — Ubuntu 22.04"]
        subgraph DockerNet["Docker network: temp-net"]
            Nginx["Nginx
80 / :443
nginx:alpine"]
            Backend["backend-api
Node.js + Express
(interno :3000)"]
            MySQL["mysql-db
MySQL 8.0
(interno :3306)"]
            Volume[("mysql_data
volumen persistente")]
        end
    end

    Internet -->|"TCP :80 / :443"| Nginx
    Nginx -->|"GET /  →  sirve front/dist"| Nginx
    Nginx -->|"/api/*  →  proxy"| Backend
    Nginx -->|"/socket.io/*  →  WebSocket"| Backend
    Backend -->|"Prisma ORM"| MySQL
    MySQL --- Volume
```

El puerto `3000` del backend y el `3306` de MySQL **no están expuestos al exterior** — solo Nginx es público en el puerto `80`. MySQL expone `3307` al host exclusivamente para conexiones de administración local (ej. DBeaver/TablePlus).

---

## Cómo funciona cada archivo

### `docker-compose.prod.yml`

Orquesta tres servicios dentro de una red interna `temp-net`:

| Servicio | Imagen | Puerto externo | Descripción |
|---|---|---|---|
| `nginx` | `nginx:alpine` | `80:80`, `443:443` | Reverse proxy + sirve el frontend estático |
| `backend-api` | Dockerfile local | solo interno `:3000` | API REST + WebSockets |
| `mysql-db` | `mysql:8.0` | `3307:3306` (admin) | Base de datos con volumen persistente |

**Dependencias y arranque ordenado:**
1. MySQL arranca primero y espera hasta pasar su healthcheck (`mysqladmin ping`)
2. El backend arranca solo cuando MySQL está healthy
3. Nginx arranca después del backend (depends_on)

**Variables de entorno del backend en este compose:**
```
DATABASE_URL=mysql://root:root@mysql-db:3306/temp
DATABASE_HOST=mysql-db
DATABASE_USER=root
DATABASE_PASSWORD=root
DATABASE_NAME=temp
```
> El hostname `mysql-db` es el nombre del servicio Docker — funciona porque ambos están en `temp-net`.
> El archivo `../backend/.env` también se carga (env_file), pero estas variables lo sobreescriben.

### `nginx/nginx.conf`

Tres bloques de rutas en el servidor `:80`:

| Ruta | Comportamiento |
|---|---|
| `/` | Sirve archivos desde `../front/dist` (montado como volumen). `try_files` asegura que el router de Vue funcione en SPA mode. |
| `/api/` | Proxy hacia `http://backend-api:3000` con headers de IP real del cliente. |
| `/socket.io/` | Proxy WebSocket con headers `Upgrade` + timeouts de 1 hora para conexiones largas. |

Gzip está habilitado para CSS, JS, JSON y XML, reduciendo el peso de los assets del frontend.

> Para agregar un dominio propio: cambia `server_name _;` por `server_name tudominio.com;`

### `init-server.sh`

Script de configuración inicial del EC2. Se ejecuta **una sola vez** como root. Hace:

1. **`apt-get upgrade`** — actualiza el sistema base
2. **SWAP de 2GB** — crítico para instancias `t3.micro`/`t3.small`. Evita el error 137 (OOM) que ocurre al compilar Node.js o al arrancar MySQL por primera vez. Si el archivo `/swapfile` ya existe, lo omite.
3. **Docker Engine** — instala desde el script oficial de Docker (`get.docker.com`), lo habilita como servicio systemd y agrega al usuario `ubuntu` (o `ec2-user`) al grupo `docker`
4. **Docker Compose plugin** — instala si no está disponible

---

## Paso a paso: despliegue completo

### Prerrequisitos

- Instancia EC2 con Ubuntu 22.04 LTS (recomendado `t3.small` — `t3.micro` puede quedarse sin RAM al compilar)
- Puertos abiertos en el Security Group de AWS:
  - `TCP 22` — SSH
  - `TCP 80` — HTTP (Nginx)
  - `TCP 443` — HTTPS (si usas SSL)
- El repositorio clonado en el servidor (o transferido via `scp`/`rsync`)

### Paso 1 — Setup inicial del servidor

```bash
sudo bash backend/deploy/init-server.sh
```

Cuando termine, **cierra la sesión SSH y vuelve a entrar** para que el grupo `docker` surta efecto (de lo contrario necesitarás `sudo` en cada comando Docker).

### Paso 2 — Configurar variables de entorno del backend

```bash
cp example.env .env
nano .env
```

Ajusta los valores necesarios. Las variables de base de datos son sobreescritas por el compose, pero estas sí debes configurar:

```env
PORT=3000
TOKEN_SECRET_KEY="una_clave_muy_larga_y_aleatoria"
TOKEN_ACCESS_TIME="8h"
TOKEN_REFRESH_TIME="7d"
```

> `DATABASE_URL`, `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD` y `DATABASE_NAME` son inyectadas directamente por `docker-compose.prod.yml` y sobreescriben lo que haya en `.env`.

### Paso 3 — Compilar el frontend

**Opción A — En el servidor EC2 (requiere más RAM):**
```bash
cd front
pnpm install
pnpm run build
cd ..
```

**Opción B — En tu máquina local (recomendado para t3.micro):**
```bash
# En tu máquina local:
cd front
pnpm run build

# Luego transferir la carpeta dist al servidor:
scp -r front/dist ubuntu@<IP_EC2>:~/backend/../front/dist
```

El `docker-compose.prod.yml` monta `../../front/dist` como volumen de solo lectura en Nginx. Si esta carpeta no existe, Nginx arrancará pero devolverá 403.

### Paso 4 — Levantar la infraestructura

Desde la raíz del repo del backend (carpeta `backend/`):

```bash
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

La primera vez tardará varios minutos — Docker descarga las imágenes base y compila el backend en multi-stage. Las veces siguientes el cache de Docker lo agiliza.

Verifica que los tres contenedores estén corriendo y saludables:

```bash
docker compose -f deploy/docker-compose.prod.yml ps
```

Deberías ver `STATUS: Up (healthy)` en `mysql-db` y `backend-api`.

### Paso 5 — Migraciones y semillas (automático)

El `entrypoint.sh` del backend maneja esto automáticamente al arrancar:

1. Ejecuta `prisma migrate deploy` para aplicar todas las migraciones pendientes
2. Si la base de datos ya tenía datos pero sin historial de migraciones (P3005), hace un baseline automático
3. Ejecuta `prisma/seed.ts` para poblar los datos iniciales (módulos, permisos, perfil admin)
4. Lanza `node dist/app.js`

Si necesitas ver los logs del proceso:
```bash
docker logs temp-backend --follow
```

---

## Comandos útiles post-despliegue

```bash
# Ver logs de todos los servicios
docker compose -f deploy/docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker logs temp-backend --follow
docker logs temp-nginx --follow
docker logs temp-mysql --follow

# Reiniciar un servicio sin reconstruir
docker compose -f deploy/docker-compose.prod.yml restart backend-api

# Reconstruir y relanzar el backend (tras un deploy de código nuevo)
docker compose -f deploy/docker-compose.prod.yml up -d --build backend-api

# Entrar al contenedor del backend (debugging)
docker exec -it temp-backend sh

# Ver el estado de salud de los contenedores
docker compose -f deploy/docker-compose.prod.yml ps

# Detener todo
docker compose -f deploy/docker-compose.prod.yml down

# Detener todo y borrar los volúmenes (¡BORRA LA BASE DE DATOS!)
docker compose -f deploy/docker-compose.prod.yml down -v
```

---

## Actualizar el código en producción

```bash
# 1. Traer los cambios del repositorio
git pull

# 2. Recompilar frontend si hubo cambios
cd ../front && pnpm run build && cd ../backend

# 3. Reconstruir y relanzar solo el backend (MySQL y Nginx no se tocan)
docker compose -f deploy/docker-compose.prod.yml up -d --build backend-api

# 4. Si hubo cambios en nginx.conf, recargar Nginx sin downtime
docker exec temp-nginx nginx -s reload
```

---

## SSL con Let's Encrypt (opcional)

Si tienes un dominio apuntando a la IP del EC2:

```bash
# 1. Instalar certbot
sudo apt install certbot python3-certbot-nginx -y

# 2. Emitir el certificado (Nginx debe estar corriendo en :80)
sudo certbot --nginx -d tudominio.com

# 3. Habilitar renovación automática
sudo systemctl enable certbot.timer
```

Certbot modificará `nginx.conf` y agregará los bloques HTTPS. Para que los cambios persistan en Docker, copia el conf actualizado de vuelta al archivo en `backend/deploy/nginx/nginx.conf`.

---

## Troubleshooting frecuente

| Problema | Causa probable | Solución |
|---|---|---|
| Error 137 en el build | OOM — sin SWAP en `t3.micro` | Correr `init-server.sh` para crear SWAP |
| `temp-backend` en estado `unhealthy` | Backend no pasa el healthcheck en `/api/health` | Revisar logs: `docker logs temp-backend` |
| Nginx devuelve 403 | `front/dist` no existe o está vacío | Compilar el frontend (Paso 3) |
| `P3005` en migraciones | DB existente sin historial Prisma | El `entrypoint.sh` lo maneja automáticamente |
| `Cannot connect to MySQL` | Backend arrancó antes que MySQL | Esperar — Docker reiniciará el backend automáticamente |
| Puerto 80 sin respuesta | Security Group sin regla TCP 80 | Agregar la regla en AWS Console |
