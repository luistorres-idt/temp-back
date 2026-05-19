#!/bin/bash
# init-server.sh
# AWS EC2 User Data script / Setup Script para Ubuntu 22.04 (o Debian)
# Ejecutar como root (sudo bash init-server.sh)

set -e

echo "=== Iniciando configuración del servidor EC2 para Proyecto Temp ==="

# 1. Actualizar sistema e instalar utilidades base
apt-get update && apt-get upgrade -y
apt-get install -y git curl htop fallocate

# 2. Configurar memoria SWAP (Vital para instancias de bajo costo t3.micro/small)
# Esto evita el temido Error 137 (OOM - Out of Memory) especialmente en compilaciones de node o mysql
if [ ! -f /swapfile ]; then
    echo "[!] Configurando 2GB de memoria Swap..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "[-] Swap configurada exitosamente."
else
    echo "[-] Swap ya está configurada."
fi

# 3. Instalar Docker
if ! command -v docker &> /dev/null; then
    echo "[!] Instalando Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    
    # Otorgar permisos al usuario por defecto en AWS Ubuntu
    usermod -aG docker ubuntu || usermod -aG docker ec2-user
    echo "[-] Docker instalado exitosamente."
fi

# 4. Verificar e instalar Docker Compose plugin
if ! docker compose version &> /dev/null; then
    echo "[!] Instalando Docker Compose..."
    apt-get install -y docker-compose-plugin
fi

echo "=== Configuración de infraestructura base finalizada ==="
echo "Nota: Si acabas de instalar Docker, es posible que necesites cerrar tu sesión SSH y volver a entrar para no requerir 'sudo' al usar docker."
