import { create } from 'zustand';
import axios from 'axios';
import { apiConfig } from '../config';
import { debug, error } from '../services/loggerService';

// Define message template interface
export interface MessageTemplate {
  id: string;
  name: string;
  level: 'info' | 'warning' | 'error';
  title: string;
  content: string;
  enabled: boolean;
}

// Cache configuration
const CACHE_DURATION = 5000; // 5 seconds cache duration

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface ConfigStore {
  // Existing configs
  language: string;
  theme: 'light' | 'dark' | 'system';
  showMiniMap: boolean;
  showControls: boolean;
  showBackground: boolean;
  lockCanvas: boolean; // Whether to lock the canvas
  compactNodes: boolean; // Whether to show compact (collapsed) device nodes
  enablePing: boolean; // Whether to enable ping探测
  pingInterval: number; // in milliseconds
  portRates: number[]; // Port rate options in Mbps
  
  // ServerChan configs
  enableServerChan: boolean; // Whether to enable ServerChan notifications
  serverChanSendKey: string; // ServerChan SendKey
  serverChanApiUrl: string; // ServerChan API URL
  serverChanUid: string; // ServerChan UID
  serverChanPassword: string; // ServerChan Password
  
  // Alert thresholds
  warningPingThreshold: number; // Warning ping threshold in ms
  criticalPingThreshold: number; // Critical ping threshold in ms
  
  // Alert count limit
  alertMaxCountPerDay: number; // Maximum number of alerts per day
  
  // Consecutive failure threshold
  alertConsecutiveFailThreshold: number; // Number of consecutive failures before alert
  
  // Message templates
  messageTemplates: MessageTemplate[]; // Message templates
  
  // Loading state
  isLoading: boolean;
  
  // Cache state
  configCache: CacheItem<any> | null;
  
  // Helper methods
  updateConfigValue: <K extends keyof ConfigStore>(key: K, value: ConfigStore[K]) => Promise<void>;
  
  // Existing actions
  updateLanguage: (language: string) => Promise<void>;
  updateTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
  toggleMiniMap: () => Promise<void>;
  toggleControls: () => Promise<void>;
  toggleBackground: () => Promise<void>;
  toggleCanvasLock: () => Promise<void>;
  toggleCompactNodes: () => Promise<void>;
  togglePing: () => Promise<void>;
  updatePingInterval: (interval: number) => Promise<void>;
  updatePortRates: (rates: number[]) => Promise<void>;
  
  // ServerChan actions
  toggleServerChan: () => Promise<void>;
  updateServerChanSendKey: (key: string) => Promise<void>;
  updateServerChanApiUrl: (url: string) => Promise<void>;
  updateServerChanUid: (uid: string) => Promise<void>;
  updateServerChanPassword: (password: string) => Promise<void>;
  
  // Alert threshold actions
  updateWarningPingThreshold: (threshold: number) => Promise<void>;
  updateCriticalPingThreshold: (threshold: number) => Promise<void>;
  updateAlertMaxCountPerDay: (count: number) => Promise<void>;
  updateAlertConsecutiveFailThreshold: (count: number) => Promise<void>;
  
  // Message template actions
  addMessageTemplate: (template: Omit<MessageTemplate, 'id'>) => Promise<void>;
  updateMessageTemplate: (template: MessageTemplate) => Promise<void>;
  deleteMessageTemplate: (id: string) => Promise<void>;
  
  // Fetch config
  fetchConfig: () => Promise<void>;
  
  // Cache management
  clearConfigCache: () => void;
}

// Create config store with MySQL backend and local persistence
const useConfigStore = create<ConfigStore>()(
  (
    // Remove persist middleware for messageTemplates to ensure data is always fetched from server
    (set, get) => ({
      // Default values
      // Existing configs
      language: 'zh',
      theme: 'system',
      showMiniMap: true,
      showControls: true,
      showBackground: true,
      lockCanvas: false, // Default: canvas is unlocked
      compactNodes: true, // Default: nodes are compact (collapsed)
      enablePing: true, // Default: enable ping探测
      pingInterval: 5000, // Default ping interval: 5 seconds
      portRates: [100, 1000, 2500, 10000], // Default port rates: 100Mbps, 1Gbps, 2.5Gbps, 10Gbps
      
      // ServerChan configs
      enableServerChan: false, // Default: disable ServerChan notifications
      serverChanSendKey: '', // Default: empty SendKey
      serverChanApiUrl: 'https://sctapi.ftqq.com', // Default ServerChan API URL
      serverChanUid: '', // Default: empty UID
      serverChanPassword: '', // Default: empty password
      
      // Alert thresholds
      warningPingThreshold: 100, // Default warning threshold: 100ms
      criticalPingThreshold: 500, // Default critical threshold: 500ms
      
      // Alert count limit
      alertMaxCountPerDay: 100, // Default maximum alerts per day: 100
      
      // Consecutive failure threshold
      alertConsecutiveFailThreshold: 5, // Default: 5 consecutive failures before alert
      
      // Message templates
      messageTemplates: [
        {
          id: '1',
          name: '设备状态告警',
          level: 'error',
          title: '【网络监控】设备状态告警',
          content: '设备名称: {{deviceName}}\n设备IP: {{deviceIp}}\n设备状态: {{deviceStatus}}\n告警时间: {{timestamp}}',
          enabled: true
        },
        {
          id: '2',
          name: '设备延时警告',
          level: 'warning',
          title: '【网络监控】设备延时警告',
          content: '设备名称: {{deviceName}}\n设备IP: {{deviceIp}}\n当前延时: {{pingTime}}ms\n告警时间: {{timestamp}}',
          enabled: true
        },
        {
          id: '3',
          name: '设备延时严重告警',
          level: 'error',
          title: '【网络监控】设备延时严重告警',
          content: '设备名称: {{deviceName}}\n设备IP: {{deviceIp}}\n当前延时: {{pingTime}}ms\n告警时间: {{timestamp}}',
          enabled: true
        }
      ],
      
      // Loading state
      isLoading: false,
      
      // Cache state
      configCache: null,

  // Helper method to update a single config value
  updateConfigValue: async <K extends keyof ConfigStore>(key: K, value: ConfigStore[K]) => {
    const previousValue = get()[key]; // Save previous value for rollback
    try {
      set({ [key]: value });
      get().clearConfigCache();
      await axios.post(`${apiConfig.baseUrl}/config`, { [key]: value });
    } catch (err) {
      // Rollback local state on failure to keep frontend/backend consistent
      set({ [key]: previousValue });
      error('Failed to update config value, rolled back:', { key, value, error: err as Error });
    }
  },
  
  // Actions
  updateLanguage: async (language: string) => {
    await get().updateConfigValue('language', language);
  },
  updateTheme: async (theme: 'light' | 'dark' | 'system') => {
    await get().updateConfigValue('theme', theme);
  },
  toggleMiniMap: async () => {
    const { showMiniMap } = get();
    await get().updateConfigValue('showMiniMap', !showMiniMap);
  },
  toggleControls: async () => {
    const { showControls } = get();
    await get().updateConfigValue('showControls', !showControls);
  },
  toggleBackground: async () => {
    const { showBackground } = get();
    await get().updateConfigValue('showBackground', !showBackground);
  },
  toggleCanvasLock: async () => {
    const { lockCanvas } = get();
    await get().updateConfigValue('lockCanvas', !lockCanvas);
  },
  toggleCompactNodes: async () => {
    const { compactNodes } = get();
    await get().updateConfigValue('compactNodes', !compactNodes);
  },
  togglePing: async () => {
    const { enablePing } = get();
    await get().updateConfigValue('enablePing', !enablePing);
  },
  updatePingInterval: async (interval: number) => {
    await get().updateConfigValue('pingInterval', interval);
  },
  updatePortRates: async (rates: number[]) => {
    await get().updateConfigValue('portRates', rates);
  },
  
  // ServerChan actions
  toggleServerChan: async () => {
    const { enableServerChan } = get();
    await get().updateConfigValue('enableServerChan', !enableServerChan);
  },
  updateServerChanSendKey: async (key: string) => {
    await get().updateConfigValue('serverChanSendKey', key);
  },
  updateServerChanApiUrl: async (url: string) => {
    await get().updateConfigValue('serverChanApiUrl', url);
  },
  updateServerChanUid: async (uid: string) => {
    await get().updateConfigValue('serverChanUid', uid);
  },
  updateServerChanPassword: async (password: string) => {
    await get().updateConfigValue('serverChanPassword', password);
  },
  
  // Alert threshold actions
  updateWarningPingThreshold: async (threshold: number) => {
    await get().updateConfigValue('warningPingThreshold', threshold);
  },
  updateCriticalPingThreshold: async (threshold: number) => {
    await get().updateConfigValue('criticalPingThreshold', threshold);
  },
  updateAlertMaxCountPerDay: async (count: number) => {
    await get().updateConfigValue('alertMaxCountPerDay', count);
  },
  updateAlertConsecutiveFailThreshold: async (count: number) => {
    await get().updateConfigValue('alertConsecutiveFailThreshold', count);
  },
  
  // Message template actions with rollback on failure
  addMessageTemplate: async (template: Omit<MessageTemplate, 'id'>) => {
    const { messageTemplates: prevTemplates } = get();
    try {
      const newId = (parseInt(prevTemplates[prevTemplates.length - 1]?.id || '0', 10) + 1).toString();
      const newTemplate = { ...template, id: newId };
      const newTemplates = [...prevTemplates, newTemplate];
      set({ messageTemplates: newTemplates });
      get().clearConfigCache();
      await axios.post(`${apiConfig.baseUrl}/config`, { messageTemplates: newTemplates });
    } catch (err) {
      // Rollback on failure
      set({ messageTemplates: prevTemplates });
      error('Failed to add message template, rolled back:', { template, error: err as Error });
    }
  },
  updateMessageTemplate: async (template: MessageTemplate) => {
    const { messageTemplates: prevTemplates } = get();
    try {
      const newTemplates = prevTemplates.map(t => t.id === template.id ? template : t);
      set({ messageTemplates: newTemplates });
      get().clearConfigCache();
      await axios.post(`${apiConfig.baseUrl}/config`, { messageTemplates: newTemplates });
    } catch (err) {
      // Rollback on failure
      set({ messageTemplates: prevTemplates });
      error('Failed to update message template, rolled back:', { template, error: err as Error });
    }
  },
  deleteMessageTemplate: async (id: string) => {
    const { messageTemplates: prevTemplates } = get();
    try {
      const newTemplates = prevTemplates.filter(t => t.id !== id);
      set({ messageTemplates: newTemplates });
      get().clearConfigCache();
      await axios.post(`${apiConfig.baseUrl}/config`, { messageTemplates: newTemplates });
    } catch (err) {
      // Rollback on failure
      set({ messageTemplates: prevTemplates });
      error('Failed to delete message template, rolled back:', { id, error: err as Error });
    }
  },
  
  fetchConfig: async () => {
    const { configCache } = get();
    const now = Date.now();
    
    // Check if we have a valid cache
    if (configCache && (now - configCache.timestamp) < CACHE_DURATION) {
      debug('Using cached config data');
      // Don't spread raw cache data — it could overwrite store functions.
      // The cache was populated from a previous fetchConfig that already applied safeFields.
      // Re-apply the same whitelist filter for safety.
      return;
    }
    
    set({ isLoading: true });
    try {
      const response = await axios.get(`${apiConfig.baseUrl}/config`);
      // Update cache
      const newCache: CacheItem<any> = {
        data: response.data,
        timestamp: now
      };
      // Only extract known config fields from server response to prevent
      // overwriting store action functions with arbitrary server data.
      const data = response.data || {};
      const safeFields: Partial<ConfigStore> = {};
      const allowedKeys: (keyof ConfigStore)[] = [
        'language', 'theme', 'showMiniMap', 'showControls', 'showBackground',
        'lockCanvas', 'compactNodes', 'enablePing', 'pingInterval', 'portRates',
        'enableServerChan', 'serverChanSendKey', 'serverChanApiUrl',
        'serverChanUid', 'serverChanPassword',
        'warningPingThreshold', 'criticalPingThreshold',
        'alertMaxCountPerDay', 'alertConsecutiveFailThreshold',
        'messageTemplates'
      ];
      for (const key of allowedKeys) {
        if (key in data) {
          (safeFields as any)[key] = data[key];
        }
      }
      set({ 
        ...safeFields, 
        isLoading: false,
        configCache: newCache
      });
    } catch (err) {
      error('Failed to fetch config:', { error: err });
      // 保留当前配置，仅更新加载状态
      set({ isLoading: false });
    }
  },
  
  // Cache management
  clearConfigCache: () => {
    set({ configCache: null });
  },
    })
  )
);

export default useConfigStore;