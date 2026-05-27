@echo off
echo Limpiando y reiniciando TODO el entorno SGSI...
docker-compose down -v
docker-compose up -d
echo Entorno reseteado y configuraciones re-importadas.
pause
