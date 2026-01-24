CREATE DATABASE IF NOT EXISTS `my_cli_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `my_cli_db`;

CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(69) NOT NULL PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    level INT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blackboards (
    entry_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(69) NOT NULL,
    content TEXT,
    slot_type VARCHAR(20) NOT NULL COMMENT 'active_draft or history',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
