#!/usr/bin/env bash
# Script para reiniciar todos los servicios del proyecto SGSI
# Uso: ./restart-services.sh

set -e

COMPOSE_FILE="$(dirname "$0")/docker-compose.yml"

step() {
    echo ""
    echo "========================================"
    echo "  $1"
    echo "========================================"
}

step "BAJANDO SERVICIOS"
docker compose -f "$COMPOSE_FILE" down

step "SUBIENDO SERVICIOS"
docker compose -f "$COMPOSE_FILE" up -d --build

echo ""
echo "Esperando que los servicios arranquen..."
sleep 10

step "ESTADO DE LOS SERVICIOS"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "========================================"
echo "  ¡Todo listo!"
echo "========================================"
echo "Frontend:  http://localhost:3000"
echo "Backend:   http://localhost:3001"
echo "Keycloak:  http://localhost:8080"
echo "Adminer:   http://localhost:8082"
echo "MySQL:     localhost:3306"
