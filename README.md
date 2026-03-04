# Backend del Proyecto

Este proyecto contiene el backend del sistema, construido con Node.js, Express, TypeScript y Prisma ORM.

## Requisitos previos

- Node.js (version 18 o superior recomendada)
- Un motor de base de datos MySQL en ejecucion

## Instalacion y configuracion

1. Clonar el repositorio.

2. Instalar las dependencias del proyecto usando pnpm:
   ```bash
   pnpm install
   ```

3. Configurar las variables de entorno:
   - Copiar el archivo de ejemplo a un nuevo archivo `.env`:
     ```bash
     copy .env.example .env
     ```
   - Abrir el archivo `.env` y configurar la URL de la base de datos y cualquier otra variable necesaria (por ejemplo, el puerto del servidor, secretos para JWT, etc.).

## Base de datos

1. Generar los artefactos de Prisma (código del cliente de base de datos):
   ```bash
   npx prisma generate
   ```

2. Ejecutar las migraciones pendientes en la base de datos:
   ```bash
   npx prisma migrate dev
   ```

3. Sembrar la base de datos con los datos iniciales y valores por defecto (modulos, acciones, permisos, perfil de administrador):
   ```bash
   npx prisma db seed
   ```

## Ejecucion del servidor

Para levantar el servidor en modo desarrollo con recarga automatica:
```bash
pnpm run dev
```

El servidor estara disponible en el puerto especificado en tu archivo `.env` (generalmente en `http://localhost:3000`). Para verificar que funciona, puedes hacer una peticion GET a la ruta `/healthy`.

## Empaquetado para produccion

Si deseas compilar el codigo TypeScript para produccion, utiliza el comando correspondiente proporcionado en tu package.json (por ejemplo, `pnpm run build`). Posteriormente, puedes iniciar el proyecto desde la carpeta compilada (usualmente en el directorio `dist`).
