#!/bin/sh
set -e

echo "Verificando estado de migraciones..."

# Intentar migrate deploy; si falla por P3005 hacer baseline primero
DEPLOY_OUTPUT=$(npx prisma migrate deploy 2>&1) || DEPLOY_FAILED=1

if [ "${DEPLOY_FAILED}" = "1" ]; then
    if echo "$DEPLOY_OUTPUT" | grep -q "P3005"; then
        echo "DB no vacia sin historial de migraciones. Realizando baseline..."
        for dir in prisma/migrations/*/; do
            [ -d "$dir" ] || continue
            name=$(basename "$dir")
            [ "$name" = "migration_lock.toml" ] && continue
            echo "  Marcando como aplicada: $name"
            npx prisma migrate resolve --applied "$name"
        done
        echo "Reintentando migrate deploy..."
        npx prisma migrate deploy
    else
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
else
    echo "$DEPLOY_OUTPUT"
fi

echo "Ejecutando semillas..."
npx tsx prisma/seed.ts

echo "Iniciando aplicacion..."
exec node dist/app.js
