import React, { Fragment, useState, useMemo } from 'react';
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
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { NetworkDevice } from '../../types';
import useNetworkStore from '../store/networkStore';
import useConfigStore from '../store/configStore';
import useTheme from '../hooks/useTheme';

const NetworkDeviceNode: React.FC<NodeProps<NetworkDevice>> = ({
  data,
  selected,
}) => {
  const { selectDevice } = useNetworkStore();
  const compactNodes = useConfigStore((s) => s.compactNodes);
  const currentTheme = useTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const handleNodeClick = () => {
    selectDevice(data);
  };

  const getDeviceIcon = () => {
    const iconStyle = { fontSize: 24, color: getStatusColor() };
    switch (data.type) {
      case 'router': return <GatewayOutlined style={iconStyle} />;
      case 'optical_modem': return <CloudOutlined style={iconStyle} />;
      case 'switch': return <ClusterOutlined style={iconStyle} />;
      case 'server': return <DatabaseOutlined style={iconStyle} />;
      case 'vm_host': return <ContainerOutlined style={iconStyle} />;
      case 'wireless_router': return <WifiOutlined style={iconStyle} />;
      case 'ap': return <BranchesOutlined style={iconStyle} />;
      default: return <DatabaseOutlined style={iconStyle} />;
    }
  };

  const getStatusColor = () => {
    switch (data.status) {
      case 'up': return '#52c41a';
      case 'down': return '#ff4d4f';
      case 'warning': return '#faad14';
      default: return '#52c41a';
    }
  };

  // Memoize handle style generator
  const handleStyleBase = useMemo(() => ({
    width: '12px',
    height: '12px',
    border: `2px solid ${currentTheme === 'dark' ? '#0e263c' : '#fff'}`,
    borderRadius: '50%',
    boxShadow: '0 0 4px rgba(0, 0, 0, 0.2)',
    cursor: 'crosshair',
    transition: 'all 0.2s ease',
  }), [currentTheme]);

  // Port summary
  const ports = data.ports || [];
  const portsUp = ports.filter(p => p.status === 'up').length;
  const portsDown = ports.filter(p => p.status !== 'up').length;

  return (
    <div style={{ padding: '8px', position: 'relative' }}>
      {ports.map((port, index) => {
        const displayRate = port.rate === 1000 ? '1G' : 
                          port.rate === 10000 ? '10G' : 
                          port.rate === 2500 ? '2.5G' : 
                          `${port.rate}M`;
        const handleStyle = {
          ...handleStyleBase,
          background: port.status === 'up' ? '#52c41a' : port.status === 'warning' ? '#faad14' : '#ff4d4f',
          top: `${30 + index * 20}px`,
        };
        
        return (
          <Fragment key={port.id}>
            <Tooltip title={`${port.name} (${displayRate})`}>
              <Handle
                id={port.id}
                type="source"
                position={Position.Right}
                style={handleStyle}
              />
            </Tooltip>
            <Tooltip title={`${port.name} (${displayRate})`}>
              <Handle
                id={port.id}
                type="target"
                position={Position.Left}
                style={handleStyle}
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
              style={{ borderRadius: '12px', padding: '0 8px', fontSize: '12px', fontWeight: 'bold' }}
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
          minWidth: '180px',
          maxWidth: '260px',
          cursor: 'pointer',
          color: currentTheme === 'dark' ? '#ffffff' : '#000000',
          boxShadow: selected ? '0 6px 20px rgba(24, 144, 255, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: selected ? 100 : 1,
        }}
        onClick={handleNodeClick}
        hoverable
      >
        {/* Compact info: IP + Ping */}
        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
          {data.ip && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#1890ff', fontWeight: 'bold' }}>IP:</span>
              <span>{data.ip}</span>
            </div>
          )}
          {data.pingTime !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#1890ff', fontWeight: 'bold' }}>Ping:</span>
              <span style={{ color: data.pingTime < 50 ? '#52c41a' : data.pingTime < 100 ? '#faad14' : '#ff4d4f' }}>
                {data.pingTime.toFixed(2)} ms
              </span>
            </div>
          )}
        </div>

        {/* Port summary line (compact mode) */}
        {compactNodes && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '12px',
              color: currentTheme === 'dark' ? '#a0b1c5' : '#8c8c8c',
              cursor: 'pointer',
              padding: '2px 0',
            }}
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            <span>
              {t('ports')}: {ports.length}
              {portsUp > 0 && <span style={{ color: '#52c41a', marginLeft: '4px' }}>↑{portsUp}</span>}
              {portsDown > 0 && <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>↓{portsDown}</span>}
            </span>
            {expanded ? <UpOutlined style={{ fontSize: '10px' }} /> : <DownOutlined style={{ fontSize: '10px' }} />}
          </div>
        )}

        {/* Expandable port details (compact: on click; full: always show) */}
        {(!compactNodes || expanded) && (
          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {ports.map((port) => (
              <div 
                key={port.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: currentTheme === 'dark' ? '#0a1929' : '#f5f5f5',
                  borderLeft: `2px solid ${port.status === 'up' ? '#52c41a' : port.status === 'warning' ? '#faad14' : '#ff4d4f'}`
                }}
              >
                <span style={{ fontWeight: 'bold', color: currentTheme === 'dark' ? '#d0d8e0' : '#595959' }}>{port.name}</span>
                <span style={{ marginLeft: 'auto', color: '#8c8c8c', fontSize: '10px' }}>
                  {port.rate === 1000 ? '1G' : port.rate === 10000 ? '10G' : port.rate === 2500 ? '2.5G' : `${port.rate}M`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* VM Host: compact VM list */}
        {data.type === 'vm_host' && data.virtualMachines && (data.virtualMachines || []).length > 0 && (
          <div style={{ marginTop: '6px', fontSize: '11px' }}>
            <div style={{ fontWeight: 'bold', color: '#1890ff', marginBottom: '4px' }}>
              VMs ({(data.virtualMachines || []).length})
            </div>
            {(data.virtualMachines || []).map((vm) => (
              <div 
                key={`vm-${vm.name}-${vm.ip}`}
                style={{ 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  backgroundColor: currentTheme === 'dark' ? '#0a1929' : '#f5f5f5',
                  borderLeft: `2px solid ${vm.status === 'up' ? '#52c41a' : '#ff4d4f'}`,
                  marginBottom: '2px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{vm.name}</span>
                <span style={{ color: '#8c8c8c', fontSize: '10px' }}>{vm.ip}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const MemoizedNetworkDeviceNode = React.memo(NetworkDeviceNode);

export default MemoizedNetworkDeviceNode;
