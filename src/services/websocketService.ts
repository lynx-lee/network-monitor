import { io, Socket } from 'socket.io-client';
import useNetworkStore from '../store/networkStore';
import { debug, error } from './loggerService';

// WebSocket connection configuration
const WS_CONFIG = {
  RECONNECTION_ATTEMPTS: 10,       // 增加重连尝试次数
  RECONNECTION_DELAY: 1000,         // 基础重连延迟
  RECONNECTION_DELAY_MAX: 30000,    // 最大重连延迟（30秒）
  TIMEOUT: 20000,                   // 连接超时时间
  PING_INTERVAL: 30000,             // 心跳间隔
  PING_TIMEOUT: 5000,               // 心跳超时时间
  MAX_TOTAL_RECONNECTION_ATTEMPTS: 50, // 绝对最大重连次数，超过后停止重连
};

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxReconnectionAttempts: number = WS_CONFIG.RECONNECTION_ATTEMPTS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(): void {
    if (!this.socket || !this.isConnected) {
      // Clean up existing socket before creating a new one to prevent connection leaks
      if (this.socket) {
        debug('Cleaning up existing disconnected socket before reconnect');
        this.socket.off();
        this.socket.disconnect();
        this.socket = null;
      }

      // Use relative path to connect to the same host as the current page
      // This works with Socket.io's automatic URL detection
      debug('Initializing WebSocket connection using relative path');
      
      try {
        this.socket = io({ 
          reconnection: false, // Disable automatic reconnection, we'll handle it manually
          timeout: WS_CONFIG.TIMEOUT,
          transports: ['websocket'], // Force WebSocket transport
        });

        this.setupEventListeners();
      } catch (err) {
        error('Failed to initialize WebSocket connection:', { error: err as Error });
        this.scheduleReconnect();
      }
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      debug('WebSocket connected successfully');
      this.isConnected = true;
      this.connectionAttempts = 0;
      this.notifyListeners('connect');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.socket.on('disconnect', (reason) => {
      debug(`WebSocket disconnected: ${reason}`);
      this.isConnected = false;
      this.notifyListeners('disconnect', reason);
      if (reason !== 'io server disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (err) => {
      this.connectionAttempts++;
      error(`WebSocket connect error (attempt ${this.connectionAttempts}/${this.maxReconnectionAttempts}):`, { error: err });
      this.notifyListeners('connect_error', err);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      debug(`WebSocket reconnect attempt ${attemptNumber}/${this.maxReconnectionAttempts}`);
      this.notifyListeners('reconnect_attempt', attemptNumber);
    });

    this.socket.on('reconnect_failed', () => {
      error(`WebSocket reconnection failed after ${this.maxReconnectionAttempts} attempts`);
      this.notifyListeners('reconnect_failed');
      // 最终重连失败后，设置更长时间的延迟后再次尝试
      this.maxReconnectionAttempts = WS_CONFIG.RECONNECTION_ATTEMPTS * 2;
      this.scheduleReconnect(30000); // 30秒后再次尝试
    });

    this.socket.on('deviceUpdate', (data: any) => {
      // Ensure we always work with an array
      const devicesToUpdate = Array.isArray(data) ? data : [data];
      
      if (import.meta.env.MODE === 'development') {
        debug('Received device update from WebSocket', { count: devicesToUpdate.length });
      }
      
      this.updateDeviceData(devicesToUpdate);
    });

    this.socket.on('error', (err) => {
      error('WebSocket error:', { error: err });
      this.notifyListeners('error', err);
    });
  }

  private scheduleReconnect(delay: number = WS_CONFIG.RECONNECTION_DELAY): void {
    // Check absolute maximum reconnection limit
    if (this.connectionAttempts >= WS_CONFIG.MAX_TOTAL_RECONNECTION_ATTEMPTS) {
      error(`WebSocket reached absolute max reconnection limit (${WS_CONFIG.MAX_TOTAL_RECONNECTION_ATTEMPTS}), stopping reconnection`);
      this.notifyListeners('reconnect_failed');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    // 指数退避算法：每次重连延迟翻倍，最大不超过RECONNECTION_DELAY_MAX
    const exponentialDelay = Math.min(
      WS_CONFIG.RECONNECTION_DELAY * Math.pow(2, this.connectionAttempts - 1),
      WS_CONFIG.RECONNECTION_DELAY_MAX
    );
    
    const actualDelay = delay === WS_CONFIG.RECONNECTION_DELAY ? exponentialDelay : delay;
    
    debug(`Scheduling reconnect in ${actualDelay}ms (attempt ${this.connectionAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      debug('Attempting to reconnect WebSocket...');
      this.connect();
    }, actualDelay);
  }

  private notifyListeners(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (err) {
          error(`Error in WebSocket listener for event ${event}:`, { error: err });
        }
      });
    }
  }

  disconnect(): void {
    debug('Manually disconnecting WebSocket');
    
    // 清除重连计时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      // 断开所有事件监听
      this.socket.off();
      // 手动断开连接
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.connectionAttempts = 0;
    // Clear all custom listeners on disconnect to prevent memory leaks
    this.removeAllListeners();
  }

  /**
   * Send device update to server via WebSocket
   * This reduces browser refresh calls and memory consumption
   */
  sendDeviceUpdate(device: any): void {
    if (this.socket && this.isConnected) {
      try {
        debug('Sending device update via WebSocket:', { deviceId: device.id });
        this.socket.emit('deviceUpdate', device);
        return;
      } catch (err) {
        error('Error sending device update via WebSocket:', { error: err });
      }
    }
    
    // WebSocket not available — just log a warning.
    debug('WebSocket not connected, device update broadcast skipped (data already saved via API)');
  }

  private updateDeviceData(updatedDevices: any[]): void {
    const { updateDevice, devices } = useNetworkStore.getState();

    // Only process non-empty device updates
    if (updatedDevices.length === 0) {
      debug('Received empty device update, skipping');
      return;
    }

    try {
      debug('Processing device updates', { count: updatedDevices.length });
      
      updatedDevices.forEach((updatedDevice) => {
        try {
          // Validate device data
          if (!updatedDevice || !updatedDevice.id) {
            error('Invalid device data:', { device: updatedDevice });
            return;
          }
          
          // Find current device to check if changes are significant
          const currentDevice = devices.find(d => d.id === updatedDevice.id);
          
          if (currentDevice) {
            // Check if device data has actually changed
            const deviceChanged = this.compareDevices(currentDevice, updatedDevice);
            if (deviceChanged) {
              // Set fromWebSocket to true to skip API call and directly update local state
              updateDevice(updatedDevice, true);
            }
          } else {
            // New device, add it
            updateDevice(updatedDevice, true);
          }
        } catch (err) {
          error(`Error updating device ${updatedDevice?.id}:`, { error: err });
        }
      });
      
    } catch (err) {
      error('Error processing device updates:', { error: err });
      // Fallback: If we encounter any error, refresh all devices from API
      debug('Falling back to fetching all devices from API');
      useNetworkStore.getState().fetchAllData();
    }
  }

  /**
   * Compare two devices to check if they are different
   */
  private compareDevices(oldDevice: any, newDevice: any): boolean {
    // Quick check: compare status and pingTime first, as these change most frequently
    if (oldDevice.status !== newDevice.status) {
      return true;
    }
    
    // Only compare pingTime if it exists in both
    if (oldDevice.pingTime !== undefined && newDevice.pingTime !== undefined) {
      // Allow small pingTime differences (0.05ms) to avoid unnecessary updates
      if (Math.abs(oldDevice.pingTime - newDevice.pingTime) > 0.05) {
        return true;
      }
    } else if (oldDevice.pingTime !== newDevice.pingTime) {
      return true;
    }
    
    // Check if critical properties have changed
    const criticalProps = [
      'label', 'ip', 'mac', 'x', 'y'
    ];

    for (const prop of criticalProps) {
      if (oldDevice[prop] !== newDevice[prop]) {
        return true;
      }
    }
    
    // Compare ports only if they exist in both
    if (oldDevice.ports && newDevice.ports) {
      // Check port count first
      if (oldDevice.ports.length !== newDevice.ports.length) {
        return true;
      }
      
      // Create port maps for faster comparison
      const oldPortMap = new Map(oldDevice.ports.map((port: any) => [port.id, port]));
      
      for (const newPort of newDevice.ports) {
        const oldPort = oldPortMap.get(newPort.id) as any;
        if (!oldPort || 
            oldPort.status !== newPort.status ||
            oldPort.trafficIn !== newPort.trafficIn ||
            oldPort.trafficOut !== newPort.trafficOut) {
          return true;
        }
      }
    } else if (oldDevice.ports !== newDevice.ports) {
      return true;
    }
    
    // Compare virtual machines only if they exist in both
    if (oldDevice.virtualMachines && newDevice.virtualMachines) {
      // Check VM count first
      if (oldDevice.virtualMachines.length !== newDevice.virtualMachines.length) {
        return true;
      }
      
      // Create VM maps for faster comparison
      const oldVmMap = new Map(oldDevice.virtualMachines.map((vm: any) => [vm.name, vm]));
      
      for (const newVm of newDevice.virtualMachines) {
        const oldVm = oldVmMap.get(newVm.name) as any;
        if (!oldVm || 
            oldVm.status !== newVm.status ||
            oldVm.ip !== newVm.ip) {
          return true;
        }
        // Only compare pingTime if it exists in both
        if (oldVm.pingTime !== undefined && newVm.pingTime !== undefined) {
          if (Math.abs(oldVm.pingTime - newVm.pingTime) > 0.05) {
            return true;
          }
        } else if (oldVm.pingTime !== newVm.pingTime) {
          return true;
        }
      }
    } else if (oldDevice.virtualMachines !== newDevice.virtualMachines) {
      return true;
    }

    return false;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getConnectionAttempts(): number {
    return this.connectionAttempts;
  }

  /**
   * Add event listener for WebSocket events
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    // Prevent duplicate listeners
    const existing = this.listeners.get(event)!;
    if (!existing.includes(listener)) {
      existing.push(listener);
    }
  }

  /**
   * Remove event listener for WebSocket events
   */
  off(event: string, listener?: Function): void {
    if (!this.listeners.has(event)) return;
    if (listener) {
      const filteredListeners = this.listeners.get(event)?.filter(l => l !== listener) || [];
      if (filteredListeners.length > 0) {
        this.listeners.set(event, filteredListeners);
      } else {
        this.listeners.delete(event);
      }
    } else {
      // Remove all listeners for this event
      this.listeners.delete(event);
    }
  }

  /**
   * Remove all listeners for all events
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }

  /**
   * Force reconnect WebSocket connection
   */
  reconnect(): void {
    debug('Forcing WebSocket reconnect');
    this.disconnect();
    setTimeout(() => this.connect(), 1000);
  }
}

export default new WebSocketService();