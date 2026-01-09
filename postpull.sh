#!/bin/bash

# Script Defininitivo de Permisos para 1Bit WhatsApp Platform
# DEBE EJECUTARSE CON SUDO: sudo ./postpull.sh

BASE_PATH="/1BIT_N8N_NEW"

echo "=== Iniciando Correccion de Permisos en $BASE_PATH ==="

# 1. Permisos de la carpeta base
chmod 755 $BASE_PATH

# 2. Configurar n8n (UID 1000)
echo "Configurando n8nData..."
mkdir -p $BASE_PATH/n8nData
chown -R 1000:1000 $BASE_PATH/n8nData
chmod -R 775 $BASE_PATH/n8nData

# 3. Configurar Postgres (UID 999) - CRITICO
# Postgres 16 es muy estricto: requiere 700 en carpetas y 600 en archivos.
echo "Configurando postgresData (UID 999)..."
mkdir -p $BASE_PATH/postgresData
chown -R 999:999 $BASE_PATH/postgresData
find $BASE_PATH/postgresData -type d -exec chmod 700 {} +
find $BASE_PATH/postgresData -type f -exec chmod 600 {} +

# 4. Configurar Qdrant (UID 1000)
echo "Configurando qdrant_storage..."
mkdir -p $BASE_PATH/qdrant_storage
chown -R 1000:1000 $BASE_PATH/qdrant_storage
chmod -R 775 $BASE_PATH/qdrant_storage

# 5. Configurar Redis (UID 1000)
echo "Configurando redisData..."
mkdir -p $BASE_PATH/redisData
chown -R 1000:1000 $BASE_PATH/redisData
chmod -R 775 $BASE_PATH/redisData

# 6. Configurar Evolution API (UID 1000)
echo "Configurando carpetas de Evolution API..."
mkdir -p $BASE_PATH/evolution_instances
mkdir -p $BASE_PATH/evolution_config
chown -R 1000:1000 $BASE_PATH/evolution_instances $BASE_PATH/evolution_config
chmod -R 775 $BASE_PATH/evolution_instances $BASE_PATH/evolution_config

echo "=== Permisos aplicados con exito ==="
echo "Ahora ejecuta: sudo docker-compose up -d"
