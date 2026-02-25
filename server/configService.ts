import mysql from 'mysql2/promise';
// Import logger service
import { loggerService } from './services/loggerService';
// Import cache service
import cacheService from './services/cacheService';
// Re-export logger for backward compatibility
export const logger = loggerService.log.bind(loggerService);

// MySQL database connection configuration - use environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'network_monitor',
  password: process.env.DB_PASSWORD || 'network_monitor_password',
  database: process.env.DB_NAME || 'network_monitor',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20', 10),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};



// Create MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database (create tables if not exists)
export const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create config table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL DEFAULT 'default',
        key_name VARCHAR(255) NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_config (user_id, key_name)
      )
    `);
    
    // Create devices table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS devices (
        id VARCHAR(255) PRIMARY KEY,
        data JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Create connections table
    await connection.execute(`
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
      )
    `);
    
    // Create alerts table
    await connection.execute(`
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
        PRIMARY KEY (id)
      )
    `);
    
    // Create device_alert_settings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS device_alert_settings (
        device_id VARCHAR(255) NOT NULL,
        enable_alerts TINYINT(1) NOT NULL DEFAULT '1',
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (device_id)
      )
    `);
    
    connection.release();
    logger('info', 'Database initialized successfully');
  } catch (error) {
    logger('warn', 'Database initialization failed, using in-memory storage', { error: (error as Error).message });
    // Don't throw error, allow application to run with in-memory storage
  }
};

// Get config value by key
export const getConfig = async (key: string, userId: string = 'default') => {
  try {
    const [rows] = await pool.execute(
      'SELECT value FROM config WHERE user_id = ? AND key_name = ?',
      [userId, key]
    );
    
    const result = rows as any[];
    if (result.length > 0) {
      return JSON.parse(result[0].value);
    }
    return null;
  } catch (error) {
    logger('warn', 'Error getting config, returning default value', { error: (error as Error).message, key, userId });
    return null;
  }
};

// Set config value
export const setConfig = async (key: string, value: any, userId: string = 'default') => {
  try {
    await pool.execute(
      `INSERT INTO config (user_id, key_name, value) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [userId, key, JSON.stringify(value)]
    );
    return true;
  } catch (error) {
    logger('warn', 'Error setting config, config will not be persisted', { error: (error as Error).message, key, value, userId });
    return true;
  }
};

// Get all config for a user
export const getAllConfig = async (userId: string = 'default') => {
  try {
    const [rows] = await pool.execute(
      'SELECT key_name, value FROM config WHERE user_id = ?',
      [userId]
    );
    
    const result = rows as any[];
    const config: Record<string, any> = {};
    result.forEach((row) => {
      config[row.key_name] = JSON.parse(row.value);
    });
    return config;
  } catch (error) {
    logger('warn', 'Error getting all config, returning empty object', { error: (error as Error).message, userId });
    return {};
  }
};

// Save device data to database
export const saveDevice = async (device: any) => {
  try {
    logger('debug', 'Saving device to database', { deviceId: device.id });
    logger('debug', 'Device type', { type: device.type });
    logger('debug', 'Device has virtualMachines', { hasVMs: device.virtualMachines !== undefined });
    if (device.virtualMachines) {
      logger('debug', 'Virtual machines count', { count: device.virtualMachines.length });
      logger('debug', 'Virtual machines', { vms: device.virtualMachines });
    }
    
    // Check if device exists and fetch existing data for incremental update
    const [existingRows] = await pool.execute(
      'SELECT data FROM devices WHERE id = ?',
      [device.id]
    );
    
    const existingResult = existingRows as any[];
    let mergedDevice = device;
    
    if (existingResult.length > 0 && existingResult[0].data) {
      // Device exists, merge incremental updates with existing data
      let existingData = existingResult[0].data;
      
      // Ensure existingData is an object (MySQL might return it as string)
      if (typeof existingData === 'string') {
        existingData = JSON.parse(existingData);
      }
      
      logger('debug', 'Merging incremental update with existing data', { deviceId: device.id });
      
      // Deep merge the incremental update into existing data
      mergedDevice = { ...(existingData as object), ...(device as object) };
      
      // Special handling for ports if it's an incremental update
      if (device.ports && Array.isArray(device.ports) && existingData.ports) {
        // Merge ports by id
        const portMap = new Map(existingData.ports.map((p: any) => [p.id, p]));
        
        device.ports.forEach((portUpdate: any) => {
          if (portMap.has(portUpdate.id)) {
            // Update existing port with incremental changes
            const existingPort = portMap.get(portUpdate.id);
            portMap.set(portUpdate.id, { ...(existingPort as object), ...(portUpdate as object) });
          } else {
            // Add new port
            portMap.set(portUpdate.id, portUpdate);
          }
        });
        
        mergedDevice.ports = Array.from(portMap.values());
      }
      
      // Special handling for virtualMachines if it's an incremental update
      if (device.virtualMachines && Array.isArray(device.virtualMachines) && existingData.virtualMachines) {
        // Merge virtual machines by name (since VM interface doesn't have id property)
        const vmMap = new Map(existingData.virtualMachines.map((vm: any) => [vm.name, vm]));
        
        device.virtualMachines.forEach((vmUpdate: any) => {
          const key = vmUpdate.name;
          if (vmMap.has(key)) {
            // Update existing VM with incremental changes
            const existingVm = vmMap.get(key);
            vmMap.set(key, { ...(existingVm as object), ...(vmUpdate as object) });
          } else {
            // Add new VM
            vmMap.set(key, vmUpdate);
          }
        });
        
        mergedDevice.virtualMachines = Array.from(vmMap.values());
      }
    }
    
    // Convert merged device to JSON string
    const deviceJson = JSON.stringify(mergedDevice);
    logger('debug', 'Device JSON string length', { length: deviceJson.length });
    
    await pool.execute(
      `INSERT INTO devices (id, data) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [device.id, deviceJson]
    );
    
    // Add default alert settings for the device
    await pool.execute(
      `INSERT INTO device_alert_settings (device_id, enable_alerts) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE device_id = device_id`,
      [device.id, 1] // Default to enabled (1 = true)
    );
    
    // Clear cache after saving
    cacheService.delete('all_devices');
    logger('debug', 'Cache cleared for all_devices');
    
    logger('debug', 'Device saved successfully', { deviceId: device.id });
    return true;
  } catch (error) {
    logger('error', 'Error saving device, device will not be persisted', { error: (error as Error).message, deviceId: device.id });
    return false;
  }
};

// Get all devices from database
export const getAllDevices = async () => {
  try {
    // Check cache first
    const cacheKey = 'all_devices';
    const cachedDevices = cacheService.get(cacheKey);
    if (cachedDevices) {
      logger('debug', 'Returning cached devices', { count: (cachedDevices as any[]).length });
      return cachedDevices;
    }

    const [rows] = await pool.execute('SELECT data FROM devices');
    const result = rows as any[];
    const devices = result.map(row => {
      // Check if data is already an object (MySQL 2 might automatically parse JSON)
      if (typeof row.data === 'object') {
        return row.data;
      }
      // Otherwise parse it as JSON
      return JSON.parse(row.data);
    });

    // Cache the result for 5 seconds
    cacheService.set(cacheKey, devices, 5000);
    logger('debug', 'Devices cached', { count: (devices as any[]).length });

    return devices;
  } catch (error) {
    logger('warn', 'Error getting all devices, returning empty array', { error: (error as Error).message });
    return [];
  }
};

// Delete device from database
export const deleteDevice = async (deviceId: string) => {
  try {
    // First delete all connections related to this device
    await pool.execute('DELETE FROM connections WHERE source = ? OR target = ?', [deviceId, deviceId]);
    // Then delete the device itself
    await pool.execute('DELETE FROM devices WHERE id = ?', [deviceId]);
    return true;
  } catch (error) {
    logger('warn', 'Error deleting device', { error: (error as Error).message, deviceId });
    return false;
  }
};

// Save connection to database
export const saveConnection = async (connection: any) => {
  try {
    await pool.execute(
      `INSERT INTO connections (id, source, target, sourcePort, targetPort, status, traffic, data) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         source = VALUES(source), 
         target = VALUES(target), 
         sourcePort = VALUES(sourcePort), 
         targetPort = VALUES(targetPort), 
         status = VALUES(status), 
         traffic = VALUES(traffic), 
         data = VALUES(data)`,
      [connection.id, connection.source, connection.target, connection.sourcePort, connection.targetPort, connection.status, connection.traffic, JSON.stringify(connection)]
    );
    return true;
  } catch (error) {
    logger('warn', 'Error saving connection', { error: (error as Error).message, connectionId: connection.id, connection });
    return false;
  }
};

// Get all connections from database
export const getAllConnections = async () => {
  try {
    // Check cache first
    const cacheKey = 'all_connections';
    const cachedConnections = cacheService.get(cacheKey);
    if (cachedConnections) {
      logger('debug', 'Returning cached connections', { count: (cachedConnections as any[]).length });
      return cachedConnections;
    }

    const [rows] = await pool.execute('SELECT data FROM connections');
    const result = rows as any[];
    const connections = result.map(row => {
      // Check if data is already an object (MySQL 2 might automatically parse JSON)
      if (typeof row.data === 'object') {
        return row.data;
      }
      // Otherwise parse it as JSON
      return JSON.parse(row.data);
    });

    // Cache the result for 5 seconds
    cacheService.set(cacheKey, connections, 5000);
    logger('debug', 'Connections cached', { count: (connections as any[]).length });

    return connections;
  } catch (error) {
    logger('warn', 'Error getting all connections, returning empty array', { error: (error as Error).message });
    return [];
  }
};

// Delete connection from database
export const deleteConnection = async (connectionId: string) => {
  try {
    await pool.execute('DELETE FROM connections WHERE id = ?', [connectionId]);
    return true;
  } catch (error) {
    logger('warn', 'Error deleting connection', { error: (error as Error).message, connectionId });
    return false;
  }
};

// Save alert to database
export const saveAlert = async (alert: any) => {
  try {
    await pool.execute(
      `INSERT INTO alerts (
        device_id, device_name, device_type, device_ip, 
        alert_type, alert_level, message, is_sent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        alert.device_id,
        alert.device_name,
        alert.device_type,
        alert.device_ip,
        alert.alert_type,
        alert.alert_level,
        alert.message,
        alert.is_sent || 0
      ]
    );
    return true;
  } catch (error) {
    logger('error', 'Error saving alert', { error: (error as Error).message, alert });
    return false;
  }
};

// Get all alerts from database
export const getAllAlerts = async () => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM alerts ORDER BY created_at DESC'
    );
    return rows as any[];
  } catch (error) {
    logger('warn', 'Error getting all alerts', { error: (error as Error).message });
    return [];
  }
};

// Get alerts by device ID
export const getAlertsByDevice = async (deviceId: string) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM alerts WHERE device_id = ? ORDER BY created_at DESC',
      [deviceId]
    );
    return rows as any[];
  } catch (error) {
    logger('warn', 'Error getting alerts by device', { error: (error as Error).message, deviceId });
    return [];
  }
};

// Get alerts by date range
export const getAlertsByDate = async (startDate: string, endDate: string) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM alerts WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC',
      [startDate, endDate]
    );
    return rows as any[];
  } catch (error) {
    logger('warn', 'Error getting alerts by date', { error: (error as Error).message, startDate, endDate });
    return [];
  }
};

// Set device alert enabled status
export const setDeviceAlertEnabled = async (deviceId: string, enabled: boolean) => {
  try {
    await pool.execute(
      `INSERT INTO device_alert_settings (device_id, enable_alerts) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE enable_alerts = VALUES(enable_alerts)`,
      [deviceId, enabled ? 1 : 0]
    );
    return true;
  } catch (error) {
    logger('error', 'Error setting device alert enabled status', { error: (error as Error).message, deviceId, enabled });
    return false;
  }
};

// Get device alert enabled status
export const getDeviceAlertEnabled = async (deviceId: string) => {
  try {
    const [rows] = await pool.execute(
      'SELECT enable_alerts FROM device_alert_settings WHERE device_id = ?',
      [deviceId]
    );
    const result = rows as any[];
    if (result.length > 0) {
      return result[0].enable_alerts === 1;
    }
    // Default to enabled if not set
    return true;
  } catch (error) {
    logger('warn', 'Error getting device alert enabled status', { error: (error as Error).message, deviceId });
    return true;
  }
};

// Get all device alert settings
export const getAllDeviceAlertSettings = async () => {
  try {
    const [rows] = await pool.execute(
      'SELECT device_id, enable_alerts FROM device_alert_settings'
    );
    
    const result = rows as any[];
    const settings: Record<string, boolean> = {};
    
    result.forEach((row) => {
      settings[row.device_id] = row.enable_alerts === 1;
    });
    
    return settings;
  } catch (error) {
    logger('error', 'Error getting all device alert settings', { error: (error as Error).message });
    return {};
  }
};

// Get today's alert count using SQL query (efficient, avoids loading all alerts)
export const getTodayAlertCount = async (): Promise<number> => {
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM alerts WHERE created_at >= CURDATE()'
    );
    const result = rows as any[];
    return result[0]?.count || 0;
  } catch (error) {
    logger('warn', 'Error getting today alert count', { error: (error as Error).message });
    return 0;
  }
};
