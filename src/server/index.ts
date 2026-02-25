import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { spawn } from 'child_process';
import {
  serverConfig
} from './config';
import {
  initializeDatabase,
  setConfig,
  getAllConfig,
  saveDevice,
  getAllDevices,
  deleteDevice,
  saveConnection,
  getAllConnections,
  deleteConnection,
  saveAlert,
  getAllAlerts,
  getAlertsByDevice,
  getAlertsByDate,
  getAllDeviceAlertSettings,
  setDeviceAlertEnabled,
  getDeviceAlertEnabled
} from './configService';
import serverChanService from './serverChanService';
import type { VirtualMachine } from '../types';
import monitoringService from './services/monitoringService';
import businessMonitoringService from './services/businessMonitoringService';
import alertService from './services/alertService';
import { loggerService } from './services/loggerService';

// Load environment variables from .env file
dotenv.config();

const logger = loggerService.log.bind(loggerService);

// Create Express app
const app = express();

// CORS configuration - restrict origin in production
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:8090'];

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? allowedOrigins
    : true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? allowedOrigins
      : true,
    methods: ['GET', 'POST'],
  },
  pingInterval: 25000,
  pingTimeout: 10000,
});

// Function to get IP address from MAC address using ARP cache
const getIpByMac = async (macAddress: string): Promise<string | null> => {
  try {
    // Run arp -a command to get ARP cache
    const arpOutput = await new Promise<string>((resolve, reject) => {
      const proc = spawn('arp', ['-a']);
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`arp exited with code ${code}: ${stderr}`));
          return;
        }
        resolve(stdout);
      });
    });
    
    // Parse ARP output to find IP address for given MAC
    const macRegex = new RegExp(`([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+at\s+${macAddress.replace(/:/g, '\\:')}`, 'i');
    const match = arpOutput.match(macRegex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    return null;
  } catch (error) {
    logger('error', `Error getting IP by MAC ${macAddress}:`, { error: (error as Error).message });
    return null;
  }
};

// Function to validate IP address format
const isValidIp = (ip: string): boolean => {
  if (!ip || ip.trim() === '') {
    return false;
  }
  
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip.trim());
};

const pingDevice = async (ip: string, timeout: number = 2000): Promise<{ isUp?: boolean; status: 'up' | 'down' | 'warning' | 'unknown'; pingTime?: number }> => {
  // If IP is empty or invalid, device is considered unknown
  if (!ip || ip.trim() === '' || !isValidIp(ip)) {
    logger('debug', 'Device IP is empty or invalid, marking as unknown', { ip });
    return { status: 'unknown' };
  }

  try {
    const timeoutSec = String(Math.max(1, Math.floor(timeout / 1000)));
    const sanitizedIp = ip.trim();

    // Use spawn with arguments array to prevent command injection
    const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const proc = spawn('ping', ['-c', '1', '-W', timeoutSec, sanitizedIp]);
      let stdoutData = '';
      let stderrData = '';
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error('Ping timeout'));
      }, timeout + 1000);

      proc.stdout.on('data', (data) => { stdoutData += data.toString(); });
      proc.stderr.on('data', (data) => { stderrData += data.toString(); });
      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({ stdout: stdoutData, stderr: stderrData });
      });
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    
    // Log full ping command output for debugging
    logger('debug', 'Raw ping output', { 
      ip, 
      stdout: stdout.trim(), 
      stderr: stderr.trim() 
    });
    
    // Check if ping was successful - more flexible check
    // Consider device as up if output contains any success indicators
    const successIndicators = [
      '1 packets transmitted, 1 received',
      '1 packets transmitted, 1 packets received', // macOS format
      '1 received',
      '0.0% packet loss', // Success indicator: no packet loss
      'bytes from',
      'time=',
      'round-trip', // macOS success indicator
      'ttl=',
      'TTL='
    ];
    
    const hasSuccessIndicator = successIndicators.some(indicator => 
      stdout.includes(indicator) || stderr.includes(indicator)
    );
    
    const isUp = hasSuccessIndicator;
    
    // Extract ping time if device is up
    let pingTime: number | undefined;
    if (isUp) {
      // Try Linux format: time=12.345 ms
      const linuxMatch = stdout.match(/time=(\d+\.?\d*)\s*ms/);
      if (linuxMatch && linuxMatch[1]) {
        pingTime = parseFloat(linuxMatch[1]);
      } 
      // Try macOS format: round-trip min/avg/max/stddev = 10.000/10.000/10.000/0.000 ms
      else if (stdout.includes('round-trip')) {
        const macMatch = stdout.match(/round-trip\s+min\/avg\/max\/stddev\s*=\s*(\d+\.?\d*)\//);
        if (macMatch && macMatch[1]) {
          pingTime = parseFloat(macMatch[1]);
        }
      }
      // Try alternative format: bytes from IP: icmp_seq=0 ttl=64 time=12.345 ms
      else {
        const altMatch = stdout.match(/time=(\d+\.?\d*)\s*ms/);
        if (altMatch && altMatch[1]) {
          pingTime = parseFloat(altMatch[1]);
        }
      }
    }
    
    // Log ping result with decision
    logger('debug', 'Ping result decision', { 
      ip, 
      isUp, 
      pingTime, 
      hasSuccessIndicator,
      stdout: stdout.trim(), 
      stderr: stderr.trim() 
    });
    
    return { status: isUp ? 'up' : 'down', pingTime };
  } catch (error) {
    // Ping failed or timed out
    logger('debug', 'Ping failed with error', { 
      ip, 
      error: (error as Error).message 
    });
    return { status: 'down' };
  }
};

// Function to collect device data with ping status
const collectDeviceData = async (config?: any) => {
  const devices = await getAllDevices();
  const pingTimeout = 2000; // 2 seconds timeout
  const enablePing = config?.enablePing !== false; // Default to true if not set
  
  logger('debug', 'Collecting device data', { deviceCount: (devices as any[]).length, enablePing });
  
  // Process each device
  const updatedDevices = await Promise.all((devices as any[]).map(async (device: any) => {
    // Get device IP by MAC if IP is empty or invalid
    let deviceIp = device.ip;
    try {
      logger('debug', 'Processing device', { id: device.id, type: device.type, ip: device.ip, mac: device.mac });
      
      if (!isValidIp(deviceIp) && device.mac && device.mac.trim() !== '') {
        logger('debug', 'Device IP is invalid, trying to get IP from MAC', { mac: device.mac });
        const ipFromMac = await getIpByMac(device.mac);
        if (ipFromMac) {
          logger('debug', 'Successfully got IP from MAC', { mac: device.mac, ip: ipFromMac });
          deviceIp = ipFromMac;
        } else {
          logger('debug', 'Failed to get IP from MAC', { mac: device.mac });
        }
      }
      
      // Determine device status based on enablePing flag
      let status: 'up' | 'down' | 'warning' | 'unknown' = device.status;
      let pingTime: number | undefined = device.pingTime;
      
      if (enablePing) {
        // Ping device if ping is enabled
        const pingResult = await pingDevice(deviceIp, pingTimeout);
        status = pingResult.status;
        pingTime = pingResult.pingTime;
      } else {
        // Skip ping, keep current status and pingTime
        logger('debug', 'Ping disabled, keeping current device status', { deviceId: device.id, currentStatus: device.status });
      }
      
      // Process virtual machines for VM hosts
      let updatedVMs = device.virtualMachines || [];
      
      if (device.type === 'vm_host' && enablePing) {
        logger('debug', 'Device is VM host, checking virtual machines', { deviceId: device.id });
        if (device.virtualMachines) {
          logger('debug', 'Device has virtualMachines array', { deviceId: device.id, vmCount: device.virtualMachines.length });
          
          if (device.virtualMachines.length > 0) {
            updatedVMs = await Promise.all(device.virtualMachines.map(async (vm: VirtualMachine) => {
              logger('debug', 'Pinging VM', { vmName: vm.name, vmIp: vm.ip });
              
              // Get VM IP by MAC if IP is empty or invalid (future enhancement)
              const vmIp = vm.ip;
              
              try {
                const { status: vmStatus, pingTime: vmPingTime } = await pingDevice(vmIp, pingTimeout);
                logger('debug', 'VM ping result', { vmName: vm.name, status: vmStatus, pingTime: vmPingTime });
                return {
                  ...vm,
                  status: vmStatus,
                  pingTime: vmPingTime
                };
              } catch (error) {
                logger('error', `Error pinging VM ${vm.name} (${vm.ip}) on device ${device.id}`, { error });
                return {
                  ...vm,
                  status: 'down',
                  pingTime: undefined
                };
              }
            }));
          } else {
            logger('debug', 'VM host has no virtual machines', { deviceId: device.id });
            updatedVMs = [];
          }
        } else {
          logger('debug', 'VM host has no virtualMachines property, initializing empty array', { deviceId: device.id });
          updatedVMs = [];
        }
      } else if (device.type === 'vm_host' && !enablePing) {
        // Skip VM pinging if ping is disabled
        logger('debug', 'Ping disabled, keeping current VM statuses', { deviceId: device.id });
        updatedVMs = device.virtualMachines || [];
      }
      
      return {
        ...device,
        status,
        pingTime,
        ip: deviceIp, // Update device IP if we got it from MAC
        virtualMachines: updatedVMs
      };
    } catch (error) {
      logger('error', `Error processing device ${device.id} (${device.ip})`, { error });
      return {
        ...device,
        status: 'down',
        pingTime: undefined,
        ip: deviceIp // Update device IP if we got it from MAC
      };
    }
  }));
  
  logger('debug', 'Device data collection completed', { updatedDevices: updatedDevices.length });
  return updatedDevices;
};

// Function to start or restart device data collection with current ping interval
let pingIntervalId: NodeJS.Timeout | null = null;

const startDeviceDataCollection = async () => {
  // Clear existing interval if any
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
  
  // Get current configuration
  const config = await getAllConfig();
  const enablePing = config.enablePing !== false; // Default to true if not set
  const pingInterval = config.pingInterval || 5000; // Default to 5 seconds if not set
  
  logger('info', 'Starting device data collection', { enablePing, pingInterval });
  
  // Only start ping interval if ping is enabled
  if (enablePing) {
    // Set new interval
    pingIntervalId = setInterval(async () => {
      logger('info', 'Starting device data collection');
      
      // Get current devices for comparison
      const currentDevices = await getAllDevices();
      const updatedDevices = await collectDeviceData(config);
      
      // Get alert thresholds from config
      const warningPingThreshold = config.warningPingThreshold || 100;
      const criticalPingThreshold = config.criticalPingThreshold || 200;
      
      // Check for alerts
      for (const updatedDevice of updatedDevices) {
        // Find current device in the database
        const currentDevice = (currentDevices as any[]).find((d: any) => d.id === updatedDevice.id);
        
        if (currentDevice) {
          // Check if status has changed to down
          if (currentDevice.status !== 'down' && updatedDevice.status === 'down') {
            // Send device status alert
            logger('info', `Device ${updatedDevice.label} is down, sending alert`);
            await serverChanService.sendDeviceStatusAlert(
              updatedDevice.id,
              updatedDevice.type,
              updatedDevice.label,
              updatedDevice.ip,
              updatedDevice.status
            );
          }
          
          // Check ping time if available
          if (updatedDevice.pingTime !== undefined) {
            // Check if pingTime has exceeded critical threshold
            if (updatedDevice.pingTime > criticalPingThreshold) {
              // Only send alert if previous pingTime was not exceeding critical threshold
              if (currentDevice.pingTime === undefined || currentDevice.pingTime <= criticalPingThreshold) {
                // Send critical ping alert
                logger('info', `Device ${updatedDevice.label} ping time ${updatedDevice.pingTime}ms exceeds critical threshold ${criticalPingThreshold}ms, sending alert`);
                await serverChanService.sendDevicePingCritical(
                  updatedDevice.id,
                  updatedDevice.type,
                  updatedDevice.label,
                  updatedDevice.ip,
                  updatedDevice.pingTime
                );
              }
            } else if (updatedDevice.pingTime > warningPingThreshold) {
              // Only send alert if previous pingTime was not exceeding warning threshold
              if (currentDevice.pingTime === undefined || currentDevice.pingTime <= warningPingThreshold) {
                // Send warning ping alert
                logger('info', `Device ${updatedDevice.label} ping time ${updatedDevice.pingTime}ms exceeds warning threshold ${warningPingThreshold}ms, sending alert`);
                await serverChanService.sendDevicePingWarning(
                  updatedDevice.id,
                  updatedDevice.type,
                  updatedDevice.label,
                  updatedDevice.ip,
                  updatedDevice.pingTime
                );
              }
            }
          }
        }
      }
      
      // Log device status summary
      const upCount = (updatedDevices as any[]).filter((d: any) => d.status === 'up').length;
      const downCount = (updatedDevices as any[]).filter((d: any) => d.status === 'down').length;
      logger('info', 'Device status summary', { total: (updatedDevices as any[]).length, up: upCount, down: downCount });
      
      io.emit('deviceUpdate', updatedDevices);
      
      // Save updated status to database
      for (const device of updatedDevices) {
        await saveDevice(device);
      }
      logger('info', 'Device data collection completed');
    }, pingInterval);
  } else {
    logger('info', 'Ping detection is disabled, skipping device data collection');
  }
};

// Handle config update to restart interval if pingInterval changes
app.post('/api/config', async (req, res) => {
  try {
    const config = req.body;
    for (const [key, value] of Object.entries(config)) {
      await setConfig(key, value);
    }
    logger('info', 'Config updated via API', config);
    
    // Restart device data collection if pingInterval or enablePing was updated
    if (config.pingInterval || config.enablePing !== undefined) {
      await startDeviceDataCollection();
    }
    
    res.json({ success: true });
  } catch (error) {
    logger('error', 'Error updating config via API', { error: (error as Error).message, config: req.body });
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Handle client connections
io.on('connection', async (socket) => {
  logger('info', 'Client connected', { socketId: socket.id });
  
  // Send initial data to new clients
  const initialData = await collectDeviceData();
  socket.emit('deviceUpdate', initialData);
  logger('debug', 'Sent initial device data to client', { socketId: socket.id, deviceCount: initialData.length });
  
  // Handle client disconnect
  socket.on('disconnect', () => {
    logger('info', 'Client disconnected', { socketId: socket.id });
  });
  
  // Handle config update from client
  socket.on('configUpdate', async (config) => {
    try {
      // Save config to database
      for (const [key, value] of Object.entries(config)) {
        await setConfig(key, value);
      }
      logger('info', 'Config updated via Socket.io', config);
      
      // Restart device data collection if pingInterval or enablePing was updated
      if (config.pingInterval || config.enablePing !== undefined) {
        await startDeviceDataCollection();
      }
    } catch (error) {
      logger('error', 'Error updating config via Socket.io', { error: (error as Error).message, config });
    }
  });
  
  // Handle device update from client
  socket.on('deviceUpdate', async (device) => {
    try {
      logger('info', 'Received device update via Socket.io', device);
      // Save device to database
      await saveDevice(device);
      
      // Broadcast the updated device to all clients
      io.emit('deviceUpdate', [device]);
      logger('info', 'Device update broadcasted to all clients', { deviceId: device.id });
    } catch (error) {
      logger('error', 'Error updating device via Socket.io', { error: (error as Error).message, device });
    }
  });
});

// API endpoints for config management

// Get all config
app.get('/api/config', async (_req, res) => {
  try {
    const config = await getAllConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// API endpoints for devices

// Get all devices
app.get('/api/devices', async (_req, res) => {
  try {
    const devices = await getAllDevices();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

// Save device
app.post('/api/devices', async (req, res) => {
  const device = req.body;
  try {
    logger('debug', 'API received device to save', { deviceId: device.id });
    const success = await saveDevice(device);
    logger('debug', 'API device save result', { success, deviceId: device.id });
    res.json({ success });
  } catch (error) {
    logger('error', 'API error saving device', { error: (error as Error).message, deviceId: device?.id });
    res.status(500).json({ success: false, error: 'Failed to save device' });
  }
});

// Delete device
app.delete('/api/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteDevice(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// Add a simple API endpoint for testing
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'WebSocket server is running' });
});

// Add detailed health check endpoint
app.get('/api/health/detailed', async (_req, res) => {
  try {
    const systemMetrics = monitoringService.getCurrentMetrics();
    const businessMetrics = businessMonitoringService.getAllMetrics();
    const systemHealth = monitoringService.getHealthStatus();
    const businessHealth = businessMonitoringService.getHealthStatus();

    const healthCheck = {
      status: systemHealth.status === 'critical' || businessHealth.status === 'critical' ? 'critical' : 
               systemHealth.status === 'warning' || businessHealth.status === 'warning' ? 'warning' : 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      system: {
        metrics: systemMetrics,
        health: systemHealth
      },
      business: {
        metrics: businessMetrics,
        health: businessHealth
      },
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'unknown',
        connectionLimit: 20,
        activeConnections: 0
      },
      websocket: {
        connectedClients: io.engine.clientsCount
      }
    };

    // Check database connection
    try {
      const connection = await (global as any).pool?.getConnection();
      if (connection) {
        healthCheck.database.status = 'connected';
        healthCheck.database.activeConnections = (global as any).pool?._allConnections?.length || 0;
        connection.release();
      }
    } catch (dbError) {
      healthCheck.database.status = 'disconnected';
      healthCheck.status = 'degraded';
    }

    res.json(healthCheck);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Health check failed',
      error: (error as Error).message 
    });
  }
});

// Error logging endpoint
app.post('/api/errors/log', async (req, res) => {
  try {
    const { error, component, stackTrace, userAgent, url } = req.body;
    logger('error', 'Frontend error reported', { 
      error, 
      component, 
      stackTrace,
      userAgent,
      url,
      timestamp: new Date().toISOString()
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log error' });
  }
});

// Alert management endpoints
app.get('/api/alerts/rules', (_req, res) => {
  try {
    const rules = alertService.getRules();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get alert rules' });
  }
});

app.get('/api/alerts/history', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const alerts = alertService.getAlerts(limit);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get alert history' });
  }
});

app.get('/api/alerts/stats', (_req, res) => {
  try {
    const stats = alertService.getAlertStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get alert stats' });
  }
});

app.post('/api/alerts/rules/:ruleId/enable', (req, res) => {
  try {
    const { ruleId } = req.params;
    alertService.enableRule(ruleId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to enable alert rule' });
  }
});

app.post('/api/alerts/rules/:ruleId/disable', (req, res) => {
  try {
    const { ruleId } = req.params;
    alertService.disableRule(ruleId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disable alert rule' });
  }
});

// API endpoints for connections

// Get all connections
app.get('/api/connections', async (_req, res) => {
  try {
    const connections = await getAllConnections();
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get connections' });
  }
});

// Save connection with duplicate check
app.post('/api/connections', async (req, res) => {
  try {
    const connection = req.body;
    const existingConnections = await getAllConnections();
    
    // Check for duplicate connections
    const isDuplicate = (existingConnections as any[]).some((conn: any) => 
      // Check both directions since connections are bidirectional
      (conn.source === connection.source && 
       conn.target === connection.target && 
       conn.sourcePort === connection.sourcePort && 
       conn.targetPort === connection.targetPort) ||
      (conn.source === connection.target && 
       conn.target === connection.source && 
       conn.sourcePort === connection.targetPort && 
       conn.targetPort === connection.sourcePort)
    );
    
    if (!isDuplicate) {
      await saveConnection(connection);
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Duplicate connection detected' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to save connection' });
  }
});

// Delete connection
app.delete('/api/connections/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteConnection(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

// Alert API endpoints

// Get all alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let alerts;
    if (startDate && endDate) {
      alerts = await getAlertsByDate(startDate as string, endDate as string);
    } else {
      alerts = await getAllAlerts();
    }
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// Save alert
app.post('/api/alerts', async (req, res) => {
  try {
    const alert = req.body;
    const success = await saveAlert(alert);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save alert' });
  }
});

// Get all device alert settings
app.get('/api/alerts/settings', async (_req, res) => {
  try {
    const settings = await getAllDeviceAlertSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get all device alert settings' });
  }
});

// Get device alert settings
app.get('/api/alerts/settings/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const enabled = await getDeviceAlertEnabled(deviceId);
    res.json({ enabled });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get device alert settings' });
  }
});

// Update device alert settings
app.post('/api/alerts/settings/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { enabled } = req.body;
    const success = await setDeviceAlertEnabled(deviceId, enabled);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update device alert settings' });
  }
});

// Get alerts by device ID
app.get('/api/alerts/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const alerts = await getAlertsByDevice(deviceId);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// Initialize database and start server
const startServer = () => {
  server.listen(serverConfig.port, () => {
    logger('info', `WebSocket server running on http://${serverConfig.host}:${serverConfig.port}`);
  });
};

const startServices = () => {
  // Start monitoring services after database is ready
  monitoringService.startMonitoring(5000);
  businessMonitoringService.startMonitoring(60000);
  alertService.startChecking(30000);
  startDeviceDataCollection();
};

initializeDatabase()
  .then(() => {
    startServices();
    startServer();
  })
  .catch((error) => {
    logger('warn', 'Failed to initialize database, starting server in degraded mode', { error: (error as Error).message });
    startServices();
    startServer();
  });
