import os from 'os';
import { loggerService } from './loggerService';

interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usage: number;
  };
  eventLoop: {
    lag: number;
  };
  uptime: number;
}

class MonitoringService {
  private metricsHistory: SystemMetrics[] = [];
  private maxHistorySize: number = 100;
  private eventLoopLag: number = 0;
  private lastEventLoopCheck: number = Date.now();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startEventLoopMonitoring();
  }

  startMonitoring(interval: number = 5000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, interval);

    loggerService.log('info', 'System monitoring started', { interval });
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    loggerService.log('info', 'System monitoring stopped');
  }

  private collectMetrics(): void {
    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      cpu: this.getCpuMetrics(),
      memory: this.getMemoryMetrics(),
      eventLoop: {
        lag: this.eventLoopLag
      },
      uptime: process.uptime()
    };

    this.addMetricsToHistory(metrics);

    // Log metrics at debug level
    loggerService.log('debug', 'System metrics collected', metrics);
  }

  private getCpuMetrics() {
    const cpus = os.cpus();
    const loadAverage = os.loadavg();
    
    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - (100 * idle / total);
    
    return {
      usage: Math.round(usage * 100) / 100,
      loadAverage: loadAverage.map(avg => Math.round(avg * 100) / 100)
    };
  }

  private getMemoryMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usage = (usedMem / totalMem) * 100;
    
    return {
      total: Math.round(totalMem / 1024 / 1024), // MB
      free: Math.round(freeMem / 1024 / 1024), // MB
      used: Math.round(usedMem / 1024 / 1024), // MB
      usage: Math.round(usage * 100) / 100 // Percentage
    };
  }

  private startEventLoopMonitoring(): void {
    const checkEventLoop = () => {
      const now = Date.now();
      const diff = now - this.lastEventLoopCheck;
      this.lastEventLoopCheck = now;
      
      // If the difference is large, the event loop was blocked
      if (diff > 100) {
        this.eventLoopLag = diff;
        loggerService.log('warn', 'Event loop lag detected', { lag: diff });
      } else {
        this.eventLoopLag = 0;
      }
      
      // Schedule next check
      setImmediate(checkEventLoop);
    };
    
    setImmediate(checkEventLoop);
  }

  private addMetricsToHistory(metrics: SystemMetrics): void {
    this.metricsHistory.push(metrics);
    
    // Keep only the last N metrics
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  getCurrentMetrics(): SystemMetrics | null {
    if (this.metricsHistory.length === 0) {
      return null;
    }
    return this.metricsHistory[this.metricsHistory.length - 1];
  }

  getMetricsHistory(): SystemMetrics[] {
    return [...this.metricsHistory];
  }

  getAverageMetrics(duration: number = 60000): SystemMetrics | null {
    const now = Date.now();
    const startTime = now - duration;
    
    const recentMetrics = this.metricsHistory.filter(
      m => m.timestamp >= startTime
    );
    
    if (recentMetrics.length === 0) {
      return null;
    }
    
    // Calculate averages
    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length;
    const avgMemoryUsage = recentMetrics.reduce((sum, m) => sum + m.memory.usage, 0) / recentMetrics.length;
    const avgEventLoopLag = recentMetrics.reduce((sum, m) => sum + m.eventLoop.lag, 0) / recentMetrics.length;
    
    return {
      timestamp: now,
      cpu: {
        usage: Math.round(avgCpuUsage * 100) / 100,
        loadAverage: recentMetrics[recentMetrics.length - 1].cpu.loadAverage
      },
      memory: {
        total: recentMetrics[recentMetrics.length - 1].memory.total,
        free: recentMetrics[recentMetrics.length - 1].memory.free,
        used: recentMetrics[recentMetrics.length - 1].memory.used,
        usage: Math.round(avgMemoryUsage * 100) / 100
      },
      eventLoop: {
        lag: Math.round(avgEventLoopLag * 100) / 100
      },
      uptime: process.uptime()
    };
  }

  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  } {
    const metrics = this.getCurrentMetrics();
    
    if (!metrics) {
      return {
        status: 'warning',
        issues: ['No metrics available']
      };
    }
    
    const issues: string[] = [];
    
    // Check CPU usage
    if (metrics.cpu.usage > 80) {
      issues.push(`High CPU usage: ${metrics.cpu.usage}%`);
    }
    
    // Check memory usage
    if (metrics.memory.usage > 80) {
      issues.push(`High memory usage: ${metrics.memory.usage}%`);
    }
    
    // Check event loop lag
    if (metrics.eventLoop.lag > 1000) {
      issues.push(`High event loop lag: ${metrics.eventLoop.lag}ms`);
    }
    
    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length >= 2 || metrics.cpu.usage > 90 || metrics.memory.usage > 90) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'warning';
    }
    
    return { status, issues };
  }
}

export const monitoringService = new MonitoringService();

export default monitoringService;
