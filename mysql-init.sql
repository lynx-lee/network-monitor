-- Create database if not exists
CREATE DATABASE IF NOT EXISTS network_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the created database
USE network_monitor;

-- Create config table
CREATE TABLE IF NOT EXISTS config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL DEFAULT 'default',
  key_name VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_config (user_id, key_name)
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(255) PRIMARY KEY,
  data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create connections table
CREATE TABLE IF NOT EXISTS connections (
  id VARCHAR(255) PRIMARY KEY,
  source VARCHAR(255) NOT NULL,
  target VARCHAR(255) NOT NULL,
  sourcePort VARCHAR(255) NOT NULL,
  targetPort VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  traffic FLOAT NOT NULL,
  data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id INT NOT NULL AUTO_INCREMENT,
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(255) NOT NULL,
  device_ip VARCHAR(255) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  alert_level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  is_sent TINYINT(1) NOT NULL DEFAULT '0',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Create device_alert_settings table
CREATE TABLE IF NOT EXISTS device_alert_settings (
  device_id VARCHAR(255) NOT NULL,
  enable_alerts TINYINT(1) NOT NULL DEFAULT '1',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (device_id)
);

-- Insert default device alert settings for test device
INSERT INTO device_alert_settings (device_id, enable_alerts) VALUES ('test-device', 0);
