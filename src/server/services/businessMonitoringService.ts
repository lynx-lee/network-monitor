import { loggerService } from './loggerService';

interface ApiMetric {
  timestamp: number;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  success: boolean;
}

interface DatabaseMetric {
  timestamp: number;
  operation: string;
  table: string;
  queryTime: number;
  success: boolean;
}

interface BusinessMetrics {
  api: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsByEndpoint: Map<string, number>;
  };
  database: {
    totalQueries: number;
    successfulQueries: number;
    failedQueries: number;
    averageQueryTime: number;
    queriesByTable: Map<string, number>;
  };
}

class BusinessMonitoringService {
  private apiMetrics: ApiMetric[] = [];
  private databaseMetrics: DatabaseMetric[] = [];
  private maxHistorySize: number = 1000;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  startMonitoring(interval: number = 60000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.logSummary();
    }, interval);

    loggerService.log('info', 'Business monitoring started', { interval });
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    loggerService.log('info', 'Business monitoring stopped');
  }

  recordApiMetric(metric: Omit<ApiMetric, 'timestamp'>): void {
    const apiMetric: ApiMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.apiMetrics.push(apiMetric);

    // Keep only last N metrics
    if (this.apiMetrics.length > this.maxHistorySize) {
      this.apiMetrics.shift();
    }

    // Log slow requests
    if (metric.responseTime > 1000) {
      loggerService.log('warn', 'Slow API request detected', {
        endpoint: metric.endpoint,
        method: metric.method,
        responseTime: metric.responseTime
      });
    }
  }

  recordDatabaseMetric(metric: Omit<DatabaseMetric, 'timestamp'>): void {
    const dbMetric: DatabaseMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.databaseMetrics.push(dbMetric);

    // Keep only last N metrics
    if (this.databaseMetrics.length > this.maxHistorySize) {
      this.databaseMetrics.shift();
    }

    // Log slow queries
    if (metric.queryTime > 500) {
      loggerService.log('warn', 'Slow database query detected', {
        operation: metric.operation,
        table: metric.table,
        queryTime: metric.queryTime
      });
    }
  }

  getApiMetrics(): BusinessMetrics['api'] {
    const totalRequests = this.apiMetrics.length;
    const successfulRequests = this.apiMetrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const averageResponseTime = totalRequests > 0
      ? this.apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
      : 0;
    
    const requestsByEndpoint = new Map<string, number>();
    this.apiMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      requestsByEndpoint.set(key, (requestsByEndpoint.get(key) || 0) + 1);
    });
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      requestsByEndpoint
    };
  }

  getDatabaseMetrics(): BusinessMetrics['database'] {
    const totalQueries = this.databaseMetrics.length;
    const successfulQueries = this.databaseMetrics.filter(m => m.success).length;
    const failedQueries = totalQueries - successfulQueries;
    
    const averageQueryTime = totalQueries > 0
      ? this.databaseMetrics.reduce((sum, m) => sum + m.queryTime, 0) / totalQueries
      : 0;
    
    const queriesByTable = new Map<string, number>();
    this.databaseMetrics.forEach(metric => {
      queriesByTable.set(metric.table, (queriesByTable.get(metric.table) || 0) + 1);
    });
    
    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      averageQueryTime: Math.round(averageQueryTime * 100) / 100,
      queriesByTable
    };
  }

  getAllMetrics(): BusinessMetrics {
    return {
      api: this.getApiMetrics(),
      database: this.getDatabaseMetrics()
    };
  }

  private logSummary(): void {
    const metrics = this.getAllMetrics();
    
    loggerService.log('info', 'Business metrics summary', {
      api: {
        totalRequests: metrics.api.totalRequests,
        successRate: metrics.api.totalRequests > 0
          ? Math.round((metrics.api.successfulRequests / metrics.api.totalRequests) * 100)
          : 0,
        averageResponseTime: metrics.api.averageResponseTime
      },
      database: {
        totalQueries: metrics.database.totalQueries,
        successRate: metrics.database.totalQueries > 0
          ? Math.round((metrics.database.successfulQueries / metrics.database.totalQueries) * 100)
          : 0,
        averageQueryTime: metrics.database.averageQueryTime
      }
    });
  }

  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  } {
    const metrics = this.getAllMetrics();
    const issues: string[] = [];
    
    // Check API success rate
    if (metrics.api.totalRequests > 0) {
      const successRate = (metrics.api.successfulRequests / metrics.api.totalRequests) * 100;
      if (successRate < 95) {
        issues.push(`Low API success rate: ${Math.round(successRate)}%`);
      }
    }
    
    // Check API response time
    if (metrics.api.averageResponseTime > 1000) {
      issues.push(`High API response time: ${metrics.api.averageResponseTime}ms`);
    }
    
    // Check database success rate
    if (metrics.database.totalQueries > 0) {
      const successRate = (metrics.database.successfulQueries / metrics.database.totalQueries) * 100;
      if (successRate < 95) {
        issues.push(`Low database success rate: ${Math.round(successRate)}%`);
      }
    }
    
    // Check database query time
    if (metrics.database.averageQueryTime > 500) {
      issues.push(`High database query time: ${metrics.database.averageQueryTime}ms`);
    }
    
    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length >= 2) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'warning';
    }
    
    return { status, issues };
  }

  clearMetrics(): void {
    this.apiMetrics = [];
    this.databaseMetrics = [];
    loggerService.log('info', 'Business metrics cleared');
  }
}

export const businessMonitoringService = new BusinessMonitoringService();

export default businessMonitoringService;
