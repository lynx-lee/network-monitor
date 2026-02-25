import React, { Fragment } from 'react';
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
import { useTranslation } from 'react-i18next';
import type { NetworkDevice } from '../../types';
import useNetworkStore from '../store/networkStore';
import useConfigStore from '../store/configStore';

const NetworkDeviceNode: React.FC<NodeProps<NetworkDevice>> = ({
  data,
  selected,
}) => {
  const { selectDevice } = useNetworkStore();
  const { theme: configTheme } = useConfigStore();
  const { t } = useTranslation();
  
  const currentTheme = React.useMemo(() => {
    if (configTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return configTheme;
  }, [configTheme]);

  const handleNodeClick = () => {
    selectDevice(data);
  };

  const getDeviceIcon = () => {
    const statusColor = getStatusColor();
    switch (data.type) {
      case 'router':
        return <GatewayOutlined style={{ fontSize: 24, color: statusColor }} />;
      case 'optical_modem':
        return <CloudOutlined style={{ fontSize: 24, color: statusColor }} />;
      case 'switch':
        return <ClusterOutlined style={{ fontSize: 24, color: statusColor }} />;
      case 'server':
        return <DatabaseOutlined style={{ fontSize: 24, color: statusColor }} />;
      case 'vm_host':
        return <ContainerOutlined style={{ fontSize: 24, color: statusColor }} />;
      case 'wireless_router':
        return <WifiOutlined style={{ fontSize: 24, color: statusColor }} />;
      case 'ap':
        return <BranchesOutlined style={{ fontSize: 24, color: statusColor }} />;
      default:
        return <DatabaseOutlined style={{ fontSize: 24, color: statusColor }} />;
    }
  };

  const getStatusColor = () => {
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
  };

  return (
    <div style={{ padding: '8px', position: 'relative' }}>
      {(data.ports || []).map((port, index) => {
        const displayRate = port.rate === 1000 ? '1 Gbps' : 
                          port.rate === 10000 ? '10 Gbps' : 
                          port.rate === 2500 ? '2.5 Gbps' : 
                          `${port.rate} Mbps`;
        const handleStyle = {
          background: port.status === 'up' ? '#52c41a' : port.status === 'warning' ? '#faad14' : '#ff4d4f',
          width: '12px', 
          height: '12px',
          top: `${30 + index * 20}px`,
          border: `2px solid ${currentTheme === 'dark' ? '#0e263c' : '#fff'}`,
          borderRadius: '50%',
          boxShadow: '0 0 4px rgba(0, 0, 0, 0.2)',
          cursor: 'crosshair',
          transition: 'all 0.2s ease',
        };
        
        return (
          <Fragment key={port.id}>
            <Tooltip key={`${port.id}-right-tooltip`} title={`${port.name} (${displayRate})`}>
              <Handle
                key={`${port.id}-right-source`}
                id={port.id}
                type="source"
                position={Position.Right}
                style={handleStyle}
                onMouseOver={(event) => {
                  const target = event.target as HTMLElement;
                  target.style.transform = 'scale(1.4)';
                  target.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.4)';
                }}
                onMouseOut={(event) => {
                  const target = event.target as HTMLElement;
                  target.style.transform = 'scale(1)';
                  target.style.boxShadow = '0 0 4px rgba(0, 0, 0, 0.2)';
                }}
              />
            </Tooltip>
            
            <Tooltip key={`${port.id}-left-tooltip`} title={`${port.name} (${displayRate})`}>
              <Handle
                key={`${port.id}-left-target`}
                id={port.id}
                type="target"
                position={Position.Left}
                style={handleStyle}
                onMouseOver={(event) => {
                  const target = event.target as HTMLElement;
                  target.style.transform = 'scale(1.4)';
                  target.style.boxShadow = '0 0 8px rgba(0, 0, 0, 0.4)';
                }}
                onMouseOut={(event) => {
                  const target = event.target as HTMLElement;
                  target.style.transform = 'scale(1)';
                  target.style.boxShadow = '0 0 4px rgba(0, 0, 0, 0.2)';
                }}
              />
            </Tooltip>
          </Fragment>
        );
      })}
      
      <Card
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getDeviceIcon()}
            <span>{data.label}</span>
            <Tag 
              color={getStatusColor()} 
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
        style={{
          backgroundColor: currentTheme === 'dark' ? '#0e263c' : '#fff',
          border: selected ? '3px solid #1890ff' : `1px solid ${currentTheme === 'dark' ? '#1f3a5f' : '#d9d9d9'}`,
          borderRadius: '12px',
          minWidth: '200px',
          cursor: 'pointer',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000',
          boxShadow: selected ? '0 6px 20px rgba(24, 144, 255, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: selected ? 100 : 1,
        }}
        onClick={handleNodeClick}
        hoverable
      >
        <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: currentTheme === 'dark' ? '#0a1929' : '#f5f5f5', borderRadius: '8px' }}>
          <div style={{ fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>IP:</span>
            <span>{data.ip || 'Unknown'}</span>
          </div>
          <div style={{ fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#1890ff', fontWeight: 'bold' }}>MAC:</span>
            <span>{data.mac}</span>
          </div>
          {data.pingTime !== undefined && (
            <div style={{ fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#1890ff', fontWeight: 'bold' }}>Ping:</span>
              <span style={{ color: data.pingTime < 50 ? '#52c41a' : data.pingTime < 100 ? '#faad14' : '#ff4d4f' }}>
                {data.pingTime.toFixed(2)} ms
              </span>
            </div>
          )}
        </div>
        
        {data.type === 'vm_host' && data.virtualMachines && (data.virtualMachines || []).length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#1890ff' }}>
              Virtual Machines ({(data.virtualMachines || []).length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(data.virtualMachines || []).map((vm) => {
                const vmStatusColor = vm.status === 'up' ? '#52c41a' : '#ff4d4f';
                return (
                  <div 
                    key={`vm-${vm.name}-${vm.ip}`}
                    style={{ 
                      padding: '6px 10px', 
                      backgroundColor: currentTheme === 'dark' ? '#0a1929' : '#f5f5f5', 
                      borderRadius: '8px',
                      borderLeft: `3px solid ${vmStatusColor}`
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>
                      {vm.name} ({(vm.status || '').toUpperCase()})
                    </div>
                    <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: currentTheme === 'dark' ? '#a0b1c5' : '#666666' }}>
                      <span>IP: {vm.ip}</span>
                      {vm.pingTime !== undefined && (
                        <span style={{ color: vm.pingTime < 50 ? '#52c41a' : vm.pingTime < 100 ? '#faad14' : '#ff4d4f' }}>
                          Ping: {vm.pingTime.toFixed(2)} ms
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '8px', marginBottom: '8px' }}>
          {t('ports')} ({(data.ports || []).length})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          {(data.ports || []).map((port) => {
            const getPortIcon = () => {
              if (port.type === 'optical') {
                return <LineChartOutlined style={{ color: '#1890ff', fontSize: '12px' }} />;
              } else {
                return <LinkOutlined style={{ color: '#52c41a', fontSize: '12px' }} />;
              }
            };
            
            return (
              <Tooltip
                key={port.id}
                title={`${port.name} - ${port.type === 'optical' ? 'Optical' : 'Electrical'} - ${port.rate} Mbps - ${port.mac}`}
                placement="top"
              >
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    fontSize: '11px',
                    backgroundColor: port.status === 'up' ? '#f6ffed' : port.status === 'warning' ? '#fff7e6' : '#fff1f0',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${port.status === 'up' ? '#52c41a' : port.status === 'warning' ? '#faad14' : '#ff4d4f'}`
                  }}
                >
                  {getPortIcon()}
                  <span style={{ fontWeight: 'bold', color: '#595959' }}>{port.name}</span>
                  <span style={{ flex: 1, textAlign: 'right', color: '#8c8c8c' }}>
                    {port.rate === 1000 ? '1 Gbps' : 
                     port.rate === 10000 ? '10 Gbps' : 
                     port.rate === 2500 ? '2.5 Gbps' : 
                     `${port.rate} Mbps`}
                  </span>
                </div>
              </Tooltip>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

const MemoizedNetworkDeviceNode = React.memo(NetworkDeviceNode);

export default MemoizedNetworkDeviceNode;
