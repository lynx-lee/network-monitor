// Shared frontend types used across stores and components

export interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * Format a port rate in Mbps to a human-readable string.
 * e.g. 100 → "100 Mbps", 1000 → "1 Gbps", 10000 → "10 Gbps"
 */
export function formatPortRate(rateMbps: number): string {
  if (rateMbps >= 10000) {
    return `${rateMbps / 1000} Gbps`;
  }
  if (rateMbps >= 1000) {
    return `${rateMbps / 1000} Gbps`;
  }
  return `${rateMbps} Mbps`;
}
