@echo off
echo Reiniciando servicios SGSI...
docker-compose down
docker-compose up -d
echo Servicios listos.
pause
