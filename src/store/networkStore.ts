import { create } from 'zustand';
import axios from 'axios';
import type { NetworkDevice, Connection, DeviceType } from '../types';
import websocketService from '../services/websocketService';
import { debug, error } from '../services/loggerService';

// API config with relative path for better compatibility across different clients
const apiConfig = {
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * API request wrapper with retry mechanism
 */
async function apiRequest<T>(
  method: 'get' | 'post' | 'delete',
  url: string,
  data?: any,
  retryAttempts: number = apiConfig.retryAttempts
): Promise<T> {
  try {
    const response = await axios({
      method,
      url: `${apiConfig.baseUrl}${url}`,
      data,
    });
    return response.data as T;
  } catch (err) {
    const error = err as Error;
    if (retryAttempts > 0 && axios.isAxiosError(error) && error.code !== 'ECONNABORTED') {
      debug('API request failed, retrying...', { url, retryAttempts, error: error.message });
      await new Promise(resolve => setTimeout(resolve, apiConfig.retryDelay));
      return apiRequest<T>(method, url, data, retryAttempts - 1);
    }
    throw error;
  }
}

// Cache configuration
const CACHE_DURATION = 5000; // 5 seconds cache duration

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// Generate random MAC address for ports only
const generateMAC = (): string => {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':');
};

// Generate random port
const generatePort = (index: number): NetworkDevice['ports'][0] => {
  // Port rate options: 100Mbps, 1000Mbps, 2.5Gbps (2500Mbps), 10Gbps (10000Mbps)
  const portRates: Array<100 | 1000 | 2500 | 10000> = [100, 1000, 2500, 10000];
  return {
    id: `port-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`, // 确保端口id唯一
    name: `Port ${index + 1}`,
    type: Math.random() > 0.5 ? 'optical' : 'electrical',
    rate: portRates[Math.floor(Math.random() * portRates.length)],
    mac: generateMAC(),
    status: ['up', 'down', 'warning'][Math.floor(Math.random() * 3)] as any,
    trafficIn: Math.random() * 1000,
    trafficOut: Math.random() * 1000,
  };
};

/**
 * Compare two devices and return only the changed fields
 */
const getDeviceChanges = (oldDevice: NetworkDevice, newDevice: NetworkDevice): Partial<NetworkDevice> => {
  const changes: Partial<NetworkDevice> = { id: newDevice.id };
  let hasChanges = false;
  
  // Compare top-level properties
  const topLevelProps: (keyof NetworkDevice)[] = [
    'label', 'ip', 'mac', 'type', 'status', 'x', 'y', 'pingTime'
  ];
  
  for (const prop of topLevelProps) {
    if (oldDevice[prop] !== newDevice[prop]) {
      changes[prop] = newDevice[prop] as any;
      hasChanges = true;
    }
  }
  
  // Compare ports if they exist
  if (oldDevice.ports && newDevice.ports) {
    const portChanges = newDevice.ports.map((newPort, index) => {
      const oldPort = oldDevice.ports?.[index];
      if (!oldPort) return newPort; // New port, send all fields
      
      const portDiff: any = { id: newPort.id };
      const portProps: (keyof NetworkDevice['ports'][0])[] = [
        'name', 'type', 'rate', 'mac', 'status', 'trafficIn', 'trafficOut'
      ];
      
      for (const prop of portProps) {
        if (oldPort[prop] !== newPort[prop]) {
          portDiff[prop] = newPort[prop];
        }
      }
      
      // Only return if there are changes
      return Object.keys(portDiff).length > 1 ? portDiff : undefined;
    }).filter(Boolean);
    
    if (portChanges.length > 0) {
      changes.ports = portChanges as NetworkDevice['ports'];
      hasChanges = true;
    }
  }
  
  // Compare virtual machines if they exist
  if (oldDevice.virtualMachines && newDevice.virtualMachines) {
    const vmChanges = newDevice.virtualMachines.map((newVm, index) => {
      const oldVm = oldDevice.virtualMachines?.[index];
      if (!oldVm) return newVm; // New VM, send all fields
      
      const vmDiff: any = { name: newVm.name };
      const vmProps: (keyof typeof newVm)[] = [
        'ip', 'status', 'pingTime'
      ];
      
      for (const prop of vmProps) {
        if (oldVm[prop] !== newVm[prop]) {
          vmDiff[prop] = newVm[prop];
        }
      }
      
      // Only return if there are changes
      return Object.keys(vmDiff).length > 1 ? vmDiff : undefined;
    }).filter(Boolean);
    
    if (vmChanges.length > 0) {
      changes.virtualMachines = vmChanges as NetworkDevice['virtualMachines'];
      hasChanges = true;
    }
  }
  
  // Only return changes if there are any
  return hasChanges ? changes : { id: newDevice.id };
};

interface NetworkStore {
  devices: NetworkDevice[];
  connections: Connection[];
  selectedDevice: NetworkDevice | null;
  isLoading: boolean;
  // Cache state
  deviceCache: CacheItem<NetworkDevice[]> | null;
  connectionCache: CacheItem<Connection[]> | null;
  addDevice: (type: DeviceType, x: number, y: number) => Promise<void>;
  updateDevice: (device: NetworkDevice, fromWebSocket?: boolean) => Promise<boolean>;
  deleteDevice: (deviceId: string) => Promise<void>;
  selectDevice: (device: NetworkDevice | null) => void;
  addConnection: (connection: Omit<Connection, 'id'>) => Promise<void>;
  updateConnection: (connection: Connection) => Promise<void>;
  deleteConnection: (connectionId: string) => Promise<void>;
  updateDeviceStatus: (deviceId: string, status: NetworkDevice['status']) => Promise<void>;
  updatePortStatus: (deviceId: string, portId: string, status: NetworkDevice['ports'][0]['status']) => Promise<void>;
  fetchDevices: () => Promise<void>;
  fetchConnections: () => Promise<void>;
  fetchAllData: () => Promise<void>;
  // Clear cache methods
  clearDeviceCache: () => void;
  clearConnectionCache: () => void;
  clearAllCache: () => void;
}

const useNetworkStore = create<NetworkStore>((set, get) => ({
  devices: [],
  connections: [],
  selectedDevice: null,
  isLoading: false,
  // Cache state
  deviceCache: null,
  connectionCache: null,

  addDevice: async (type: DeviceType, x: number, y: number) => {
    const newDevice: NetworkDevice = {
      id: `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${Date.now().toString().slice(-4)}`,
      x,
      y,
      ports: Array.from({ length: 1 }, (_, i) => generatePort(i)), // Default to 1 port
      status: 'up',
      ip: '', // Empty IP, user must input it
      mac: '', // Empty MAC, optional input
    };
    
    try {
      // Save to database with retry mechanism
      await apiRequest('post', '/devices', newDevice);
      // Update local state
      set((state) => ({ devices: [...state.devices, newDevice] }));
      // Clear cache to ensure consistency
      get().clearDeviceCache();
    } catch (err) {
      error('Failed to add device:', { error: err as Error });
    }
  },

  updateDevice: async (updatedDevice: NetworkDevice, fromWebSocket: boolean = false) => {
    try {
      // 基本验证
      if (!updatedDevice || !updatedDevice.id) {
        error('Invalid device data: Missing required fields');
        return false;
      }
      
      const { devices } = get();
      const currentDevice = devices.find(d => d.id === updatedDevice.id);
      
      debug('Updating device:', { deviceId: updatedDevice.id });
      debug('Device type:', { type: updatedDevice.type });
      debug('Device has virtualMachines:', { hasVMs: updatedDevice.virtualMachines !== undefined });
      if (updatedDevice.virtualMachines) {
        debug('Virtual machines count:', { count: updatedDevice.virtualMachines.length });
        debug('Virtual machines:', { vms: updatedDevice.virtualMachines });
      }
      
      // If update is from WebSocket, just update local state
      if (fromWebSocket) {
        debug('Updating device from WebSocket, skipping API call');
        
        // Update local state directly
        set((state) => ({
          devices: state.devices.map((device) =>
            device.id === updatedDevice.id ? updatedDevice : device
          ),
        }));
        
        debug('Device update from WebSocket, local state updated');
        return true;
      }
      
      // For local updates, save to database first
      // Calculate incremental changes if device already exists
      let dataToSend = updatedDevice;
      if (currentDevice) {
        // Get only changed fields
        const changes = getDeviceChanges(currentDevice, updatedDevice);
        // Only send if there are actual changes (excluding id)
        if (Object.keys(changes).length > 1) {
          dataToSend = changes as NetworkDevice;
          debug('Sending incremental device update:', { changes });
        } else {
          debug('No changes detected for device:', { deviceId: updatedDevice.id });
          return true;
        }
      }
      
      // Save to database to persist the device position
      // Use POST since backend saveDevice supports INSERT/UPDATE
      debug('Sending device update to API:', { dataToSend });
      const response = await apiRequest<{ success: boolean }>('post', '/devices', dataToSend);
      
      debug('API response:', { response });
      
      // Check if save was successful
      if (response.success) {
        // Use WebSocket for device updates to reduce browser refresh calls and memory consumption
        // This is more efficient than direct API calls and provides real-time updates to all clients
        debug('Sending device update via WebSocket');
        websocketService.sendDeviceUpdate(dataToSend);
        
        // Update local state only if save was successful
        set((state) => ({
          devices: state.devices.map((device) =>
            device.id === updatedDevice.id ? updatedDevice : device
          ),
        }));
        
        debug('Device update saved to database, sent via WebSocket, local state updated');
        return true;
      } else {
        error('Failed to update device: Server returned success=false');
        return false;
      }
    } catch (err) {
      error('Failed to update device with error:', { error: err as Error });
      return false;
    }
  },

  deleteDevice: async (deviceId: string) => {
    try {
      // Delete from database with retry mechanism
      await apiRequest('delete', `/devices/${deviceId}`);
      // Update local state
      set((state) => ({
        devices: state.devices.filter((device) => device.id !== deviceId),
        connections: state.connections.filter(
          (conn) => conn.source !== deviceId && conn.target !== deviceId
        ),
        selectedDevice: state.selectedDevice?.id === deviceId ? null : state.selectedDevice,
      }));
      // Clear cache to ensure consistency
      get().clearDeviceCache();
      get().clearConnectionCache();
    } catch (err) {
      error('Failed to delete device:', { error: err as Error, deviceId });
    }
  },

  selectDevice: (device: NetworkDevice | null) => {
    set({ selectedDevice: device });
  },

  addConnection: async (connection: Omit<Connection, 'id'>) => {
    const newConnection: Connection = {
      ...connection,
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    debug('Adding connection:', { connection: newConnection });
    
    try {
      // Save connection to database with retry mechanism
      const response = await apiRequest<{ success: boolean; error?: string }>('post', '/connections', newConnection);
      debug('Connection API response:', { response });
      
      if (response.success) {
        // Update local state only if connection was successfully saved
        set((state) => ({ connections: [...state.connections, newConnection] }));
        // Clear cache to ensure consistency
        get().clearConnectionCache();
        debug('Connection added successfully');
      } else {
        error('Failed to add connection from server:', { error: response.error });
      }
    } catch (err) {
      error('Failed to add connection with error:', { error: err as Error });
    }
  },

  updateConnection: async (updatedConnection: Connection) => {
    try {
      // Save connection to database with retry mechanism
      const response = await apiRequest<{ success: boolean }>('post', '/connections', updatedConnection);
      
      // Update local state only if save was successful
      if (response.success) {
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === updatedConnection.id ? updatedConnection : conn
          ),
        }));
        // Clear cache to ensure consistency
        get().clearConnectionCache();
      } else {
        error('Failed to update connection: Server returned success=false');
      }
    } catch (err) {
      error('Failed to update connection:', { error: err as Error, connectionId: updatedConnection.id });
    }
  },
  
  deleteConnection: async (connectionId: string) => {
    try {
      // Delete connection from database with retry mechanism
      const response = await apiRequest<{ success: boolean }>('delete', `/connections/${connectionId}`);
      
      // Update local state only if delete was successful
      if (response.success) {
        set((state) => ({ connections: state.connections.filter((conn) => conn.id !== connectionId) }));
        // Clear cache to ensure consistency
        get().clearConnectionCache();
      } else {
        error('Failed to delete connection: Server returned success=false');
      }
    } catch (err) {
      error('Failed to delete connection:', { error: err as Error, connectionId });
    }
  },
  
  updateDeviceStatus: async (deviceId: string, status: NetworkDevice['status']) => {
    const { devices } = get();
    const device = devices.find((d) => d.id === deviceId);
    
    if (device) {
      const updatedDevice = { ...device, status };
      try {
        // First save to database to ensure persistence with retry mechanism
        const response = await apiRequest<{ success: boolean }>('post', '/devices', updatedDevice);
        
        if (response.success) {
          // Use WebSocket for device status updates
          websocketService.sendDeviceUpdate(updatedDevice);
          
          // Update local state only if save was successful
          set((state) => ({
            devices: state.devices.map((d) =>
              d.id === deviceId ? updatedDevice : d
            ),
          }));
          // Clear cache to ensure consistency
          get().clearDeviceCache();
        } else {
          error('Failed to update device status: Server returned success=false');
        }
      } catch (err) {
        error('Failed to update device status:', { error: err as Error, deviceId });
      }
    }
  },
  
  updatePortStatus: async (deviceId: string, portId: string, status: NetworkDevice['ports'][0]['status']) => {
    const { devices } = get();
    const device = devices.find((d) => d.id === deviceId);
    
    if (device) {
      const updatedPorts = device.ports.map((port) =>
        port.id === portId ? { ...port, status } : port
      );
      const updatedDevice = { ...device, ports: updatedPorts };
      try {
        // First save to database to ensure persistence with retry mechanism
        const response = await apiRequest<{ success: boolean }>('post', '/devices', updatedDevice);
        
        if (response.success) {
          // Use WebSocket for port status updates
          websocketService.sendDeviceUpdate(updatedDevice);
          
          // Update local state only if save was successful
          set((state) => ({
            devices: state.devices.map((d) =>
              d.id === deviceId ? updatedDevice : d
            ),
          }));
          // Clear cache to ensure consistency
          get().clearDeviceCache();
        } else {
          error('Failed to update port status: Server returned success=false');
        }
      } catch (err) {
        error('Failed to update port status:', { error: err as Error, deviceId, portId });
      }
    }
  },

  fetchDevices: async () => {
    const { deviceCache } = get();
    const now = Date.now();
    
    // Check if we have a valid cache
    if (deviceCache && (now - deviceCache.timestamp) < CACHE_DURATION) {
      debug('Using cached devices data');
      set({ devices: deviceCache.data, isLoading: false });
      return;
    }
    
    set({ isLoading: true });
    try {
      // Fetch devices from database with retry mechanism
      const devicesData = await apiRequest<NetworkDevice[]>('get', '/devices');
      // Ensure we get an array
      const validDevicesData = Array.isArray(devicesData) ? devicesData : [];
      debug('Fetched devices from API:', { count: validDevicesData.length });
      // Update cache
      const newCache: CacheItem<NetworkDevice[]> = {
        data: validDevicesData,
        timestamp: now
      };
      set({ devices: validDevicesData, deviceCache: newCache, isLoading: false });
    } catch (err) {
      error('Failed to fetch devices:', { error: err as Error });
      set({ isLoading: false });
      // Fallback to empty array to prevent UI issues
      set({ devices: [] });
    }
  },
  
  fetchConnections: async () => {
    const { connectionCache } = get();
    const now = Date.now();
    
    // Check if we have a valid cache
    if (connectionCache && (now - connectionCache.timestamp) < CACHE_DURATION) {
      debug('Using cached connections data');
      set({ connections: connectionCache.data, isLoading: false });
      return;
    }
    
    set({ isLoading: true });
    try {
      // Fetch connections from database with retry mechanism
      const connectionsData = await apiRequest<Connection[]>('get', '/connections');
      // Ensure we get an array
      const validConnectionsData = Array.isArray(connectionsData) ? connectionsData : [];
      debug('Fetched connections from API:', { count: validConnectionsData.length });
      // Update cache
      const newCache: CacheItem<Connection[]> = {
        data: validConnectionsData,
        timestamp: now
      };
      set({ connections: validConnectionsData, connectionCache: newCache, isLoading: false });
    } catch (err) {
      error('Failed to fetch connections:', { error: err as Error });
      set({ isLoading: false });
      // Fallback to empty array to prevent UI issues
      set({ connections: [] });
    }
  },
  
  fetchAllData: async () => {
    try {
      set({ isLoading: true });
      // 并行执行，确保即使一个失败，另一个也能执行
      const results = await Promise.allSettled([
        get().fetchDevices(),
        get().fetchConnections()
      ]);
      
      // 记录执行结果
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const operation = index === 0 ? 'fetchDevices' : 'fetchConnections';
          error(`Operation ${operation} failed:`, { error: result.reason });
        }
      });
      
      set({ isLoading: false });
    } catch (err) {
      error('Failed to fetch all data:', { error: err as Error });
      // Ensure state is consistent even if fetch fails
      set({ isLoading: false });
      // 保留现有数据，只在无法恢复时清空
      set({ devices: [], connections: [] });
    }
  },
  
  // Clear cache methods
  clearDeviceCache: () => {
    set({ deviceCache: null });
  },
  
  clearConnectionCache: () => {
    set({ connectionCache: null });
  },
  
  clearAllCache: () => {
    set({ deviceCache: null, connectionCache: null });
  },
}));

export default useNetworkStore;