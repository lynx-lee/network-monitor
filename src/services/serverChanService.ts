import axios from 'axios';
import useConfigStore from '../store/configStore';
import { apiConfig } from '../config';

// Define template variables interface
interface TemplateVariables {
  deviceName: string;
  deviceIp: string;
  deviceStatus: string;
  pingTime?: number;
  timestamp: string;
}

class ServerChanService {
  // Cache for device alert settings to reduce API requests
  private alertSettingsCache: Map<string, { enabled: boolean; timestamp: number }> = new Map();
  // Cache expiry time in milliseconds (5 minutes)
  private readonly CACHE_EXPIRY = 5 * 60 * 1000;

  // Replace template variables in content
  private replaceTemplateVariables(content: string, variables: TemplateVariables): string {
    return content
      .replace(/{{deviceName}}/g, variables.deviceName)
      .replace(/{{deviceIp}}/g, variables.deviceIp)
      .replace(/{{deviceStatus}}/g, variables.deviceStatus)
      .replace(/{{pingTime}}/g, variables.pingTime?.toString() || '')
      .replace(/{{timestamp}}/g, variables.timestamp);
  }

  // Send message using ServerChan
  public async sendMessage(templateId: string, variables: TemplateVariables, deviceId: string, deviceType: string): Promise<boolean> {
    try {
      const configStore = useConfigStore.getState();
      
      // Check if ServerChan is enabled
      if (!configStore.enableServerChan) {
        console.log('ServerChan is disabled, skipping message sending');
        return false;
      }

      // Check if SendKey is configured
      if (!configStore.serverChanSendKey) {
        console.error('ServerChan SendKey is not configured, skipping message sending');
        return false;
      }

      // Check device alert enabled status
      const deviceAlertEnabled = await this.checkDeviceAlertEnabled(deviceId);
      if (!deviceAlertEnabled) {
        console.log(`Alert is disabled for device ${deviceId}, skipping message sending`);
        return false;
      }

      // Check alert count limit per day
      const alertCountExceeded = await this.checkAlertCountLimit();
      if (alertCountExceeded) {
        console.log(`Alert count limit exceeded, skipping message sending`);
        return false;
      }

      // Find the template
      const template = configStore.messageTemplates.find(t => t.id === templateId);
      if (!template || !template.enabled) {
        console.log(`Template ${templateId} not found or disabled, skipping message sending`);
        return false;
      }

      // Prepare message content
      const title = this.replaceTemplateVariables(template.title, variables);
      const content = this.replaceTemplateVariables(template.content, variables);
      
      // Send message using ServerChan API
      const response = await axios.post(
        `${configStore.serverChanApiUrl}/${configStore.serverChanSendKey}.send`,
        { title, desp: content },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Check response status
      const isSent = response.data && response.data.code === 0;
      
      // Save alert to database
      await this.saveAlertToDatabase({
        device_id: deviceId,
        device_name: variables.deviceName,
        device_type: deviceType,
        device_ip: variables.deviceIp,
        alert_type: templateId === '1' ? 'status' : 'ping',
        alert_level: template.level,
        message: content,
        is_sent: isSent
      });

      if (isSent) {
        console.log('Message sent successfully via ServerChan');
      } else {
        console.error('Failed to send message via ServerChan:', response.data);
      }
      
      return isSent;
    } catch (error) {
      console.error('Error sending message via ServerChan:', error);
      return false;
    }
  }
  
  // Check if device alert is enabled with caching
  private async checkDeviceAlertEnabled(deviceId: string): Promise<boolean> {
    try {
      // Check if we have a cached value that hasn't expired
      const cachedValue = this.alertSettingsCache.get(deviceId);
      const now = Date.now();
      
      if (cachedValue && (now - cachedValue.timestamp) < this.CACHE_EXPIRY) {
        // Return cached value if it's still valid
        return cachedValue.enabled;
      }
      
      // If cache is expired or doesn't exist, fetch from API
      const response = await axios.get(`${apiConfig.baseUrl}/alerts/settings/${deviceId}`);
      const enabled = response.data.enabled;
      
      // Update cache with new value and timestamp
      this.alertSettingsCache.set(deviceId, { enabled, timestamp: now });
      
      return enabled;
    } catch (error) {
      console.error(`Failed to check alert setting for device ${deviceId}:`, error);
      // Default to enabled if check fails
      return true;
    }
  }
  
  // Check if alert count limit is exceeded
  private async checkAlertCountLimit(): Promise<boolean> {
    try {
      const configStore = useConfigStore.getState();
      const alertMaxCountPerDay = configStore.alertMaxCountPerDay || 100;
      
      // Get all alerts and filter by today's date
      const response = await axios.get(`${apiConfig.baseUrl}/alerts`);
      const alerts = response.data;
      
      // Filter alerts from today
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayAlerts = alerts.filter((alert: any) => {
        const alertDate = new Date(alert.created_at);
        return alertDate >= todayStart;
      });
      
      return todayAlerts.length >= alertMaxCountPerDay;
    } catch (error) {
      console.error('Failed to check alert count limit:', error);
      // Default to not exceeded if check fails
      return false;
    }
  }
  
  // Save alert to database
  private async saveAlertToDatabase(alert: any): Promise<boolean> {
    try {
      await axios.post(`${apiConfig.baseUrl}/alerts`, alert);
      return true;
    } catch (error) {
      console.error('Failed to save alert to database:', error);
      return false;
    }
  }

  // Send device status alert
  public async sendDeviceStatusAlert(deviceId: string, deviceType: string, deviceName: string, deviceIp: string, deviceStatus: string): Promise<boolean> {
    return this.sendMessage('1', {
      deviceName,
      deviceIp,
      deviceStatus,
      timestamp: new Date().toLocaleString()
    }, deviceId, deviceType);
  }

  // Send device ping warning
  public async sendDevicePingWarning(deviceId: string, deviceType: string, deviceName: string, deviceIp: string, pingTime: number): Promise<boolean> {
    return this.sendMessage('2', {
      deviceName,
      deviceIp,
      deviceStatus: 'warning',
      pingTime,
      timestamp: new Date().toLocaleString()
    }, deviceId, deviceType);
  }

  // Send device ping critical alert
  public async sendDevicePingCritical(deviceId: string, deviceType: string, deviceName: string, deviceIp: string, pingTime: number): Promise<boolean> {
    return this.sendMessage('3', {
      deviceName,
      deviceIp,
      deviceStatus: 'error',
      pingTime,
      timestamp: new Date().toLocaleString()
    }, deviceId, deviceType);
  }
}

export default new ServerChanService();
