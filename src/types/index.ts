export type DeviceType = 'router' | 'switch' | 'server' | 'wireless_router' | 'ap' | 'optical_modem' | 'vm_host';

// Virtual Machine interface
export interface VirtualMachine {
  name: string;
  ip: string;
  status: 'up' | 'down' | 'warning' | 'unknown';
  pingTime?: number; // ping response time in milliseconds
}

// Port rate options in Mbps
export type PortRate = 100 | 1000 | 2500 | 10000;

export type PortType = 'optical' | 'electrical';

export interface DevicePort {
  id: string;
  name: string;
  type: PortType;
  rate: PortRate; // Mbps
  mac: string;
  status: 'up' | 'down' | 'warning';
  trafficIn: number; // current traffic in Mbps
  trafficOut: number; // current traffic in Mbps
}

export interface NetworkDevice {
  id: string;
  type: DeviceType;
  label: string;
  x: number;
  y: number;
  ports: DevicePort[];
  status: 'up' | 'down' | 'warning' | 'unknown';
  ip: string;
  mac: string;
  pingTime?: number; // ping response time in milliseconds
  virtualMachines?: VirtualMachine[]; // Virtual machines for VM host devices
}

export interface Connection {
  id: string;
  source: string;
  target: string;
  sourcePort: string;
  targetPort: string;
  status: 'up' | 'down' | 'warning';
  traffic: number; // current traffic in Mbps
}

export interface NetworkTopology {
  devices: NetworkDevice[];
  connections: Connection[];
}
