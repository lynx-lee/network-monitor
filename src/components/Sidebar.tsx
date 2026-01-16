import React from 'react';
import { Card, Button, Divider, Space, Typography } from 'antd';
import {
  GatewayOutlined,
  CloudOutlined,
  ClusterOutlined,
  DatabaseOutlined,
  WifiOutlined,
  ContainerOutlined,
  BranchesOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import useConfigStore from '../store/configStore';
import type { DeviceType } from '../types';

const { Title, Text } = Typography;

interface SidebarProps {
  onAddDevice: (type: DeviceType) => void;
  onOpenConfigPanel: () => void;
  onOpenAlertPanel: () => void;
  collapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onAddDevice, onOpenConfigPanel, onOpenAlertPanel, collapsed }) => {
  const { t } = useTranslation();
  const { theme: configTheme } = useConfigStore();

  // 获取当前主题
  const currentTheme = React.useMemo(() => {
    if (configTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return configTheme;
  }, [configTheme]);

  // 主题样式配置
  const isDark = currentTheme === 'dark';
  const sidebarBg = isDark ? '#0e263c' : '#f5f5f5';
  const textColor = isDark ? '#ffffff' : '#000000';
  const secondaryTextColor = isDark ? '#a0b1c5' : '#666666';
  const cardBg = isDark ? '#0a1929' : '#ffffff';
  const cardBorder = isDark ? '1px solid #1f3a5f' : '1px solid #d9d9d9';

  const deviceTypes: { type: DeviceType; icon: React.ReactNode; label: string }[] = [
    { type: 'optical_modem', icon: <CloudOutlined />, label: t('opticalModem') },
    { type: 'router', icon: <GatewayOutlined />, label: t('router') },
    { type: 'switch', icon: <ClusterOutlined />, label: t('switch') },
    { type: 'server', icon: <DatabaseOutlined />, label: t('server') },
    { type: 'vm_host', icon: <ContainerOutlined />, label: t('vmHost') },
    { type: 'wireless_router', icon: <WifiOutlined />, label: t('wirelessRouter') },
    { type: 'ap', icon: <BranchesOutlined />, label: t('accessPoint') },
  ];

  return (
    <div style={{ 
      width: collapsed ? '80px' : '250px', 
      padding: collapsed ? '8px' : '16px', 
      backgroundColor: sidebarBg, 
      color: textColor,
      height: '100vh', 
      overflowY: 'auto',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: collapsed ? '2px 0 8px rgba(0, 0, 0, 0.1)' : '4px 0 12px rgba(0, 0, 0, 0.15)',
    }}>
      {!collapsed && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Title level={4} style={{ color: textColor, margin: 0 }}>{t('networkMonitor')}</Title>
            <LanguageSwitcher />
          </div>
          
          <Text type="secondary" style={{ color: secondaryTextColor }}>{t('dragDevicesToCanvas')}</Text>
          
          <Divider style={{ backgroundColor: isDark ? '#1f3a5f' : '#e8e8e8' }}>{t('addDevices')}</Divider>
        </>
      )}
      
      <Card 
        size="small" 
        title={!collapsed && t('deviceTypes')} 
        style={{ 
          marginBottom: collapsed ? '8px' : '16px',
          backgroundColor: cardBg,
          border: cardBorder,
          color: textColor,
          padding: collapsed ? '8px' : '0',
        }}
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          {deviceTypes.map((device) => (
            <Button
              key={device.type}
              type="default"
              icon={device.icon}
              block
              onClick={() => onAddDevice(device.type)}
              size={collapsed ? 'small' : 'large'}
              style={{ 
                justifyContent: collapsed ? 'center' : 'flex-start', 
                fontSize: collapsed ? '12px' : '14px', 
                padding: collapsed ? '8px' : '10px',
                backgroundColor: isDark ? '#051221' : '#ffffff',
                color: textColor,
                border: cardBorder,
              }}
            >
              {!collapsed && (
                <Space orientation="horizontal" style={{ width: '100%', justifyContent: 'space-between' }}>
                  {device.label}
                  <PlusOutlined />
                </Space>
              )}
            </Button>
          ))}
        </Space>
      </Card>
      
      {!collapsed && (
        <>
          <Card 
            size="small" 
            title={t('instructions')} 
            style={{ 
              marginBottom: '16px',
              backgroundColor: cardBg,
              border: cardBorder,
              color: textColor,
            }}
          >
            <div style={{ fontSize: '12px', lineHeight: '1.5', color: textColor }}>
              <div style={{ marginBottom: '8px' }}><strong>{t('instruction1')}</strong></div>
              <div style={{ marginBottom: '8px' }}><strong>{t('instruction2')}</strong></div>
              <div style={{ marginBottom: '8px' }}><strong>{t('instruction3')}</strong></div>
              <div style={{ marginBottom: '8px' }}><strong>{t('instruction4')}</strong></div>
              <div style={{ marginBottom: '8px' }}><strong>{t('instruction5')}</strong></div>
            </div>
          </Card>
          
          <Card 
            size="small" 
            title={t('statusLegend')} 
            style={{ 
              marginBottom: '16px',
              backgroundColor: cardBg,
              border: cardBorder,
              color: textColor,
            }}
          >
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', color: textColor }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', backgroundColor: '#52c41a', borderRadius: '50%' }}></div>
                <span>{t('statusUp')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', backgroundColor: '#faad14', borderRadius: '50%' }}></div>
                <span>{t('statusWarning')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', backgroundColor: '#ff4d4f', borderRadius: '50%' }}></div>
                <span>{t('statusDown')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', backgroundColor: '#faad14', borderRadius: '50%' }}></div>
                <span>{t('statusUnknown')}</span>
              </div>
            </div>
          </Card>
        </>
      )}
      
      {/* Action Buttons */}
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* System Config Button */}
        <Button
          type="primary"
          block
          onClick={onOpenConfigPanel}
          size={collapsed ? 'small' : 'large'}
          style={{ 
            justifyContent: collapsed ? 'center' : 'flex-start', 
            fontSize: collapsed ? '12px' : '14px', 
            padding: collapsed ? '8px' : '10px',
          }}
        >
          {!collapsed && t('systemConfig')}
        </Button>
        
        {/* Alert Panel Button */}
        <Button
          type="default"
          block
          onClick={onOpenAlertPanel}
          size={collapsed ? 'small' : 'large'}
          style={{ 
            justifyContent: collapsed ? 'center' : 'flex-start', 
            fontSize: collapsed ? '12px' : '14px', 
            padding: collapsed ? '8px' : '10px',
            marginTop: collapsed ? '8px' : '0',
          }}
        >
          {!collapsed && '告警信息'}
        </Button>
      </Space>
    </div>
  );
};

export default Sidebar;
