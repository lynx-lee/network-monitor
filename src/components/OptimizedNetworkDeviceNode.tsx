import React, { memo, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { Card, Tag, Tooltip } from 'antd';
import {
  GatewayOutlined,
  CloudOutlined,
  ClusterOutlined,
  DatabaseOutlined,
  WifiOutlined,
  ContainerOutlined,
  BranchesOutlined,
  LinkOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import type { NetworkDevice } from '../types';
import useNetworkStore from '../store/networkStore';
import useConfigStore from '../store/configStore';

interface OptimizedNetworkDeviceNodeProps extends NodeProps<NetworkDevice> {
  data: NetworkDevice;
  selected: boolean;
}

const OptimizedNetworkDeviceNode: React.FC<OptimizedNetworkDeviceNodeProps> = memo(({
  data,
  selected,
}) => {
  const { selectDevice } = useNetworkStore();
  const { theme: configTheme } = useConfigStore();

  // 获取当前主题 - 使用useMemo避免重复计算
  const currentTheme = useMemo(() => {
    if (configTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return configTheme;
  }, [configTheme]);

  // 缓存状态颜色 - 避免重复计算
  const statusColor = useMemo(() => {
    switch (data.status) {
      case 'up':
        return '#52c41a';
      case 'down':
        return '#ff4d4f';
      case 'warning':
        return '#faad14';
      default:
        return '#52c41a';
    }
  }, [data.status]);

  // 缓存设备图标 - 避免重复创建
  const deviceIcon = useMemo(() => {
    switch (data.type) {
      case 'router':
        return <GatewayOutlined style={{ fontSize: 24, color: statusColor }} />;
      case 'optical_modem':
        return <CloudOutlined style={{ fontSize: 24, color: statusColor }} />;
      case 'switch':
        return <ClusterOutlined style={{ fontSize: 24, color: statusColor }} />;
      case 'server':
        return <DatabaseOutlined style={{ fontSize: 24, color: statusColor }} />;
      case 'wireless_router':
        return <WifiOutlined style={{ fontSize: 24, color: statusColor }} />;
      case 'ap':
        return <BranchesOutlined style={{ fontSize: 24, color: statusColor }} />;
      default:
        return <ContainerOutlined style={{ fontSize: 24, color: statusColor }} />;
    }
  }, [data.type, statusColor]);

  // 缓存端口数据 - 避免重复计算
  const portsData = useMemo(() => {
    return (data.ports || []).map((port) => {
      const displayRate = port.rate === 1000 ? '1 Gbps' : 
                          port.rate === 10000 ? '10 Gbps' : 
                          port.rate === 2500 ? '2.5 Gbps' : 
                          `${port.rate} Mbps`;
      return { port, displayRate };
    });
  }, [data.ports]);

  // 缓存虚拟机数据 - 避免重复计算
  const vmsData = useMemo(() => {
    return (data.virtualMachines || []).map((vm) => {
      const vmStatusColor = vm.status === 'up' ? '#52c41a' : '#ff4d4f';
      return { vm, vmStatusColor };
    });
  }, [data.virtualMachines]);

  const handleNodeClick = () => {
    selectDevice(data);
  };

  // 优化后的Handle样式 - 使用CSS变量减少重复样式
  const handleStyle = useMemo(() => ({
    width: '12px',
    height: '12px',
    background: statusColor,
    border: '2px solid #fff',
    borderRadius: '50%',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'crosshair',
  }), [statusColor]);

  // 优化后的卡片样式 - 使用CSS变量减少重复样式
  const cardStyle = useMemo(() => ({
    backgroundColor: currentTheme === 'dark' ? '#0e263c' : '#fff',
    border: selected ? '2px solid #1890ff' : `1px solid ${currentTheme === 'dark' ? '#1f3a5f' : '#d9d9d9'}`,
    borderRadius: '12px',
    minWidth: '200px',
    cursor: 'pointer',
    color: currentTheme === 'dark' ? '#ffffff' : '#000000',
    boxShadow: selected ? '0 4px 16px rgba(24, 144, 255, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    willChange: 'transform',
  }), [currentTheme, selected, statusColor]);

  return (
    <div style={{ padding: '8px', position: 'relative' }}>
      {/* 优化后的连接点 - 使用CSS类减少内联样式 */}
      {portsData.map(({ port, displayRate }) => (
        <React.Fragment key={port.id}>
          <Tooltip title={`${port.name} (${displayRate})`} placement="right">
            <Handle
              id={`${port.id}-source`}
              type="source"
              position={Position.Right}
              style={handleStyle}
            />
          </Tooltip>
          <Tooltip title={`${port.name} (${displayRate})`} placement="left">
            <Handle
              id={`${port.id}-target`}
              type="target"
              position={Position.Left}
              style={handleStyle}
            />
          </Tooltip>
        </React.Fragment>
      ))}

      <Card
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {deviceIcon}
            <span>{data.label}</span>
            <Tag 
              color={statusColor} 
              style={{ 
                borderRadius: '12px', 
                padding: '0 8px', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {(data.status || '').toUpperCase()}
            </Tag>
          </div>
        }
        variant={selected ? 'outlined' : 'borderless'}
        style={cardStyle}
        onClick={handleNodeClick}
        hoverable
      >
        {/* 设备信息 - 使用CSS类优化 */}
        <div className="device-info">
          <div className="info-row">
            <span className="label">IP:</span>
            <span className="value">{data.ip || 'Unknown'}</span>
          </div>
          <div className="info-row">
            <span className="label">MAC:</span>
            <span className="value">{data.mac}</span>
          </div>
          {data.pingTime !== undefined && (
            <div className="info-row">
              <span className="label">Ping:</span>
              <span 
                className="value" 
                style={{ 
                  color: data.pingTime < 50 ? '#52c41a' : 
                         data.pingTime < 100 ? '#faad14' : '#ff4d4f' 
                }}
              >
                {data.pingTime.toFixed(2)} ms
              </span>
            </div>
          )}
        </div>

        {/* 虚拟机部分 - 使用CSS类优化 */}
        {data.type === 'vm_host' && vmsData.length > 0 && (
          <div className="vm-section">
            <div className="section-title">
              Virtual Machines ({vmsData.length})
            </div>
            <div className="vm-list">
              {vmsData.map(({ vm, vmStatusColor }) => (
                <div 
                  key={`vm-${vm.name}-${vm.ip}`}
                  className="vm-item"
                  style={{ borderLeftColor: vmStatusColor }}
                >
                  <div className="vm-name">
                    {vm.name} ({(vm.status || '').toUpperCase()})
                  </div>
                  <div className="vm-info">
                    <span>IP: {vm.ip}</span>
                    {vm.pingTime !== undefined && (
                      <span 
                        className="vm-ping"
                        style={{ color: vm.pingTime < 50 ? '#52c41a' : 
                                      vm.pingTime < 100 ? '#faad14' : '#ff4d4f' }}
                      >
                        Ping: {vm.pingTime.toFixed(2)} ms
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 端口部分 - 使用CSS类优化 */}
        <div className="ports-section">
          <div className="section-title">
            Ports ({portsData.length})
          </div>
          <div className="ports-grid">
            {portsData.map(({ port, displayRate }) => (
              <Tooltip
                key={port.id}
                title={`${port.name} - ${port.type === 'optical' ? 'Optical' : 'Electrical'} - ${displayRate} - ${port.mac}`}
                placement="top"
              >
                <div 
                  className={`port-item port-${port.status}`}
                  style={{ 
                    backgroundColor: port.status === 'up' ? '#f6ffed' : 
                                   port.status === 'warning' ? '#fff7e6' : '#fff1f0',
                    borderLeftColor: port.status === 'up' ? '#52c41a' : 
                                   port.status === 'warning' ? '#faad14' : '#ff4d4f'
                  }}
                >
                  <div className="port-icon">
                    {port.type === 'optical' ? 
                      <LineChartOutlined style={{ color: '#1890ff', fontSize: '12px' }} /> : 
                      <LinkOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
                    }
                  </div>
                  <div className="port-name">{port.name}</div>
                  <div className="port-rate">{displayRate}</div>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时重新渲染
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.status === nextProps.data.status &&
    prevProps.data.pingTime === nextProps.data.pingTime &&
    prevProps.data.ip === nextProps.data.ip &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.selected === nextProps.selected
  );
});

OptimizedNetworkDeviceNode.displayName = 'OptimizedNetworkDeviceNode';

export default OptimizedNetworkDeviceNode;
