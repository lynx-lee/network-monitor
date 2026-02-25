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
  UNIQUE KEY unique_config (user_id, key_name),
  INDEX idx_user_id (user_id),
  INDEX idx_key_name (key_name),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create devices table with optimized structure
CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  label VARCHAR(255) NOT NULL,
  ip VARCHAR(45),
  mac VARCHAR(17),
  status VARCHAR(20) NOT NULL DEFAULT 'unknown',
  ping_time FLOAT,
  data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_ip (ip),
  INDEX idx_mac (mac),
  INDEX idx_updated_at (updated_at),
  INDEX idx_label (label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ports table for device ports
CREATE TABLE IF NOT EXISTS device_ports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  port_id VARCHAR(255) NOT NULL,
  port_name VARCHAR(255),
  port_type VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'unknown',
  port_number INT,
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_port (device_id, port_id),
  INDEX idx_device_id (device_id),
  INDEX idx_status (status),
  INDEX idx_port_number (port_number),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create virtual_machines table
CREATE TABLE IF NOT EXISTS virtual_machines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  vm_name VARCHAR(255) NOT NULL,
  vm_ip VARCHAR(45),
  vm_status VARCHAR(20) NOT NULL DEFAULT 'unknown',
  ping_time FLOAT,
  data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vm (device_id, vm_name),
  INDEX idx_device_id (device_id),
  INDEX idx_vm_status (vm_status),
  INDEX idx_vm_ip (vm_ip),
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create connections table with optimized structure
CREATE TABLE IF NOT EXISTS connections (
  id VARCHAR(255) PRIMARY KEY,
  source VARCHAR(255) NOT NULL,
  target VARCHAR(255) NOT NULL,
  source_port VARCHAR(255) NOT NULL,
  target_port VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  traffic FLOAT NOT NULL DEFAULT 0,
  data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_source (source),
  INDEX idx_target (target),
  INDEX idx_status (status),
  INDEX idx_traffic (traffic),
  INDEX idx_updated_at (updated_at),
  FOREIGN KEY (source) REFERENCES devices(id) ON DELETE CASCADE,
  FOREIGN KEY (target) REFERENCES devices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create alerts table with optimized structure
CREATE TABLE IF NOT EXISTS alerts (
  id INT NOT NULL AUTO_INCREMENT,
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  device_ip VARCHAR(255) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  alert_level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  is_sent TINYINT(1) NOT NULL DEFAULT '0',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_device_id (device_id),
  INDEX idx_alert_type (alert_type),
  INDEX idx_alert_level (alert_level),
  INDEX idx_is_sent (is_sent),
  INDEX idx_created_at (created_at),
  INDEX idx_device_alert_level (device_id, alert_level, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create device_alert_settings table
CREATE TABLE IF NOT EXISTS device_alert_settings (
  device_id VARCHAR(255) NOT NULL,
  enable_alerts TINYINT(1) NOT NULL DEFAULT '1',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (device_id),
  INDEX idx_enable_alerts (enable_alerts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default device alert settings for test device
INSERT INTO device_alert_settings (device_id, enable_alerts) VALUES ('test-device', 0);
