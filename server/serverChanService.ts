import axios from 'axios';
import { getAllConfig, getTodayAlertCount, getDeviceAlertEnabled, saveAlert } from './configService';
import { loggerService } from './services/loggerService';

const logger = loggerService.log.bind(loggerService);

// Define message template interface
interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  level: string;
}

// Define template variables interface
interface TemplateVariables {
  deviceName: string;
  deviceIp: string;
  deviceStatus: string;
  pingTime?: number;
  timestamp: string;
}

class ServerChanService {
  // Cache for device alert settings to reduce database queries
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
      // Get current configuration
      const config = await getAllConfig();
      
      // Check if ServerChan is enabled
      if (!config.enableServerChan) {
        logger('debug', 'ServerChan is disabled, skipping message sending');
        return false;
      }

      // Check if SendKey is configured
      if (!config.serverChanSendKey) {
        logger('warn', 'ServerChan SendKey is not configured, skipping message sending');
        return false;
      }

      // Check device alert enabled status
      const deviceAlertEnabled = await this.checkDeviceAlertEnabled(deviceId);
      if (!deviceAlertEnabled) {
        logger('debug', `Alert is disabled for device ${deviceId}, skipping message sending`);
        return false;
      }

      // Check alert count limit per day
      const alertCountExceeded = await this.checkAlertCountLimit(config);
      if (alertCountExceeded) {
        logger('warn', 'Alert count limit exceeded, skipping message sending');
        return false;
      }

      // Find the template
      const template = config.messageTemplates?.find((t: MessageTemplate) => t.id === templateId);
      if (!template || !template.enabled) {
        logger('debug', `Template ${templateId} not found or disabled, skipping message sending`);
        return false;
      }

      // Prepare message content
      const title = this.replaceTemplateVariables(template.title, variables);
      const content = this.replaceTemplateVariables(template.content, variables);
      
      // Send message using ServerChan API
      const response = await axios.post(
        `${config.serverChanApiUrl}/${config.serverChanSendKey}.send`,
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
        logger('info', 'Message sent successfully via ServerChan');
      } else {
        logger('error', 'Failed to send message via ServerChan', { response: response.data });
      }
      
      return isSent;
    } catch (error) {
      logger('error', 'Error sending message via ServerChan', { error: (error as Error).message });
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
      
      // If cache is expired or doesn't exist, fetch from database
      const enabled = await getDeviceAlertEnabled(deviceId);
      
      // Update cache with new value and timestamp
      this.alertSettingsCache.set(deviceId, { enabled, timestamp: now });
      
      return enabled;
    } catch (error) {
      logger('error', `Failed to check alert setting for device ${deviceId}`, { error: (error as Error).message });
      // Default to enabled if check fails
      return true;
    }
  }
  
  // Check if alert count limit is exceeded (uses efficient SQL COUNT query)
  private async checkAlertCountLimit(config: any): Promise<boolean> {
    try {
      const alertMaxCountPerDay = config.alertMaxCountPerDay || 100;
      const todayCount = await getTodayAlertCount();
      return todayCount >= alertMaxCountPerDay;
    } catch (error) {
      logger('error', 'Failed to check alert count limit', { error: (error as Error).message });
      return false;
    }
  }
  
  // Save alert to database
  private async saveAlertToDatabase(alert: any): Promise<boolean> {
    try {
      await saveAlert(alert);
      return true;
    } catch (error) {
      logger('error', 'Failed to save alert to database', { error: (error as Error).message });
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
