#!/usr/bin/env pwsh
# Script para reiniciar todos los servicios del proyecto SGSI
# Uso: .\restart-services.ps1

$ErrorActionPreference = "Stop"
$ComposeFile = Join-Path $PSScriptRoot "docker-compose.yml"

function Write-Step ($msg) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

Write-Step "BAJANDO SERVICIOS"
docker compose -f "$ComposeFile" down

Write-Step "LIMPIANDO (opcional)"
Write-Host "Eliminando contenedores detenidos y redes huérfanas..." -ForegroundColor Yellow
# docker system prune -f  # Descomentá si querés limpieza agresiva

Write-Step "SUBIENDO SERVICIOS"
docker compose -f "$ComposeFile" up -d --build

Write-Host "`nEsperando que los servicios arranquen..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Step "ESTADO DE LOS SERVICIOS"
docker compose -f "$ComposeFile" ps

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ¡Todo listo!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "Backend:   http://localhost:3001" -ForegroundColor White
Write-Host "Keycloak:  http://localhost:8080" -ForegroundColor White
Write-Host "Adminer:   http://localhost:8082" -ForegroundColor White
Write-Host "MySQL:     localhost:3306" -ForegroundColor White
