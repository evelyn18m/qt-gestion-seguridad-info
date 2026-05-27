CREATE DATABASE IF NOT EXISTS keycloak_db;
CREATE USER IF NOT EXISTS 'keycloak_user'@'%' IDENTIFIED BY 'keycloak_password';
GRANT ALL PRIVILEGES ON keycloak_db.* TO 'keycloak_user'@'%';

CREATE DATABASE IF NOT EXISTS sgsi_db;
CREATE USER IF NOT EXISTS 'sgsi_user'@'%' IDENTIFIED BY 'sgsi_password';
GRANT ALL PRIVILEGES ON sgsi_db.* TO 'sgsi_user'@'%';

FLUSH PRIVILEGES;
