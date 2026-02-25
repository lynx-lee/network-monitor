import { loggerService } from './loggerService';
import monitoringService from './monitoringService';
import businessMonitoringService from './businessMonitoringService';

interface AlertRule {
  id: string;
  name: string;
  type: 'system' | 'business';
  condition: (metrics: any) => boolean;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  cooldown: number; // Cooldown period in milliseconds
  lastTriggered: number;
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  data: any;
}

class AlertService {
  private rules: AlertRule[] = [];
  private alerts: Alert[] = [];
  private maxAlerts: number = 1000;
  private checkInterval: NodeJS.Timeout | null = null;
  private notificationCallbacks: Map<string, (alert: Alert) => void> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // System alert rules
    this.addRule({
      id: 'high-cpu-usage',
      name: 'High CPU Usage',
      type: 'system',
      condition: (metrics) => metrics.cpu?.usage > 80,
      severity: 'warning',
      enabled: true,
      cooldown: 60000, // 1 minute
      lastTriggered: 0
    });

    this.addRule({
      id: 'critical-cpu-usage',
      name: 'Critical CPU Usage',
      type: 'system',
      condition: (metrics) => metrics.cpu?.usage > 90,
      severity: 'critical',
      enabled: true,
      cooldown: 30000, // 30 seconds
      lastTriggered: 0
    });

    this.addRule({
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      type: 'system',
      condition: (metrics) => metrics.memory?.usage > 80,
      severity: 'warning',
      enabled: true,
      cooldown: 60000, // 1 minute
      lastTriggered: 0
    });

    this.addRule({
      id: 'critical-memory-usage',
      name: 'Critical Memory Usage',
      type: 'system',
      condition: (metrics) => metrics.memory?.usage > 90,
      severity: 'critical',
      enabled: true,
      cooldown: 30000, // 30 seconds
      lastTriggered: 0
    });

    this.addRule({
      id: 'high-event-loop-lag',
      name: 'High Event Loop Lag',
      type: 'system',
      condition: (metrics) => metrics.eventLoop?.lag > 1000,
      severity: 'warning',
      enabled: true,
      cooldown: 60000, // 1 minute
      lastTriggered: 0
    });

    // Business alert rules
    this.addRule({
      id: 'low-api-success-rate',
      name: 'Low API Success Rate',
      type: 'business',
      condition: (metrics) => {
        if (metrics.api?.totalRequests > 10) {
          const successRate = (metrics.api.successfulRequests / metrics.api.totalRequests) * 100;
          return successRate < 95;
        }
        return false;
      },
      severity: 'warning',
      enabled: true,
      cooldown: 120000, // 2 minutes
      lastTriggered: 0
    });

    this.addRule({
      id: 'high-api-response-time',
      name: 'High API Response Time',
      type: 'business',
      condition: (metrics) => metrics.api?.averageResponseTime > 1000,
      severity: 'warning',
      enabled: true,
      cooldown: 60000, // 1 minute
      lastTriggered: 0
    });

    this.addRule({
      id: 'low-database-success-rate',
      name: 'Low Database Success Rate',
      type: 'business',
      condition: (metrics) => {
        if (metrics.database?.totalQueries > 10) {
          const successRate = (metrics.database.successfulQueries / metrics.database.totalQueries) * 100;
          return successRate < 95;
        }
        return false;
      },
      severity: 'warning',
      enabled: true,
      cooldown: 120000, // 2 minutes
      lastTriggered: 0
    });

    this.addRule({
      id: 'high-database-query-time',
      name: 'High Database Query Time',
      type: 'business',
      condition: (metrics) => metrics.database?.averageQueryTime > 500,
      severity: 'warning',
      enabled: true,
      cooldown: 60000, // 1 minute
      lastTriggered: 0
    });
  }

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
    loggerService.log('info', 'Alert rule added', { ruleId: rule.id, ruleName: rule.name });
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    loggerService.log('info', 'Alert rule removed', { ruleId });
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
      loggerService.log('info', 'Alert rule updated', { ruleId, updates });
    }
  }

  enableRule(ruleId: string): void {
    this.updateRule(ruleId, { enabled: true });
  }

  disableRule(ruleId: string): void {
    this.updateRule(ruleId, { enabled: false });
  }

  startChecking(interval: number = 30000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkRules();
    }, interval);

    loggerService.log('info', 'Alert checking started', { interval });
  }

  stopChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    loggerService.log('info', 'Alert checking stopped');
  }

  private checkRules(): void {
    const systemMetrics = monitoringService.getCurrentMetrics();
    const businessMetrics = businessMonitoringService.getAllMetrics();

    this.rules.forEach(rule => {
      if (!rule.enabled) {
        return;
      }

      // Check cooldown
      const now = Date.now();
      if (now - rule.lastTriggered < rule.cooldown) {
        return;
      }

      // Check condition
      const metrics = rule.type === 'system' ? systemMetrics : businessMetrics;
      if (rule.condition(metrics)) {
        this.triggerAlert(rule, metrics);
      }
    });
  }

  private triggerAlert(rule: AlertRule, metrics: any): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${rule.id}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, metrics),
      timestamp: Date.now(),
      data: metrics
    };

    // Add to alerts history
    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    // Update rule's last triggered time
    rule.lastTriggered = Date.now();

    // Log alert
    loggerService.log(
      rule.severity === 'critical' ? 'error' : 'warn',
      'Alert triggered',
      {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: alert.message
      }
    );

    // Send notifications
    this.sendNotifications(alert);
  }

  private generateAlertMessage(rule: AlertRule, metrics: any): string {
    switch (rule.id) {
      case 'high-cpu-usage':
      case 'critical-cpu-usage':
        return `${rule.name}: CPU usage is ${metrics.cpu?.usage.toFixed(1)}%`;
      case 'high-memory-usage':
      case 'critical-memory-usage':
        return `${rule.name}: Memory usage is ${metrics.memory?.usage.toFixed(1)}%`;
      case 'high-event-loop-lag':
        return `${rule.name}: Event loop lag is ${metrics.eventLoop?.lag}ms`;
      case 'low-api-success-rate':
        const apiSuccessRate = (metrics.api?.successfulRequests / metrics.api?.totalRequests * 100).toFixed(1);
        return `${rule.name}: API success rate is ${apiSuccessRate}%`;
      case 'high-api-response-time':
        return `${rule.name}: Average API response time is ${metrics.api?.averageResponseTime}ms`;
      case 'low-database-success-rate':
        const dbSuccessRate = (metrics.database?.successfulQueries / metrics.database?.totalQueries * 100).toFixed(1);
        return `${rule.name}: Database success rate is ${dbSuccessRate}%`;
      case 'high-database-query-time':
        return `${rule.name}: Average database query time is ${metrics.database?.averageQueryTime}ms`;
      default:
        return rule.name;
    }
  }

  private sendNotifications(alert: Alert): void {
    this.notificationCallbacks.forEach((callback, id) => {
      try {
        callback(alert);
      } catch (error) {
        loggerService.log('error', 'Error in notification callback', { id, error });
      }
    });
  }

  addNotificationCallback(id: string, callback: (alert: Alert) => void): void {
    this.notificationCallbacks.set(id, callback);
    loggerService.log('info', 'Notification callback added', { id });
  }

  removeNotificationCallback(id: string): void {
    this.notificationCallbacks.delete(id);
    loggerService.log('info', 'Notification callback removed', { id });
  }

  getAlerts(limit?: number): Alert[] {
    if (limit) {
      return this.alerts.slice(-limit);
    }
    return [...this.alerts];
  }

  getAlertsBySeverity(severity: 'info' | 'warning' | 'critical', limit?: number): Alert[] {
    const filtered = this.alerts.filter(a => a.severity === severity);
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  getAlertsByRule(ruleId: string, limit?: number): Alert[] {
    const filtered = this.alerts.filter(a => a.ruleId === ruleId);
    if (limit) {
      return filtered.slice(-limit);
    }
    return filtered;
  }

  getRules(): AlertRule[] {
    return [...this.rules];
  }

  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.find(r => r.id === ruleId);
  }

  clearAlerts(): void {
    this.alerts = [];
    loggerService.log('info', 'Alerts cleared');
  }

  getAlertStats(): {
    total: number;
    bySeverity: Record<string, number>;
    byRule: Record<string, number>;
  } {
    const bySeverity: Record<string, number> = {};
    const byRule: Record<string, number> = {};

    this.alerts.forEach(alert => {
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
      byRule[alert.ruleId] = (byRule[alert.ruleId] || 0) + 1;
    });

    return {
      total: this.alerts.length,
      bySeverity,
      byRule
    };
  }
}

export const alertService = new AlertService();

export default alertService;
