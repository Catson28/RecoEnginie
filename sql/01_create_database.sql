-- ============================================================
-- ReconEngine — 01: Criar Base de Dados e Utilizador
-- ============================================================
-- Executar como root: mysql -u root -p < 01_create_database.sql

CREATE DATABASE IF NOT EXISTS reconengine
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Utilizador de aplicação (não usar root em produção)
CREATE USER IF NOT EXISTS 'recon_app'@'%' IDENTIFIED BY 'change_me_in_production';
GRANT ALL PRIVILEGES ON reconengine.* TO 'recon_app'@'%';
FLUSH PRIVILEGES;

SELECT '✓ Database reconengine criada e utilizador recon_app configurado.' AS status;
