import React, { useState, useEffect } from 'react';
import { Modal, Table, Tabs, Switch, Space, Tag, Card } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { apiConfig } from '../config';
import useNetworkStore from '../store/networkStore';
import useTheme from '../hooks/useTheme';
import type { NetworkDevice } from '../../types';

interface Alert {
  id: number;
  device_id: string;
  device_name: string;
  device_type: string;
  device_ip: string;
  alert_type: string;
  alert_level: 'info' | 'warning' | 'error';
  message: string;
  is_sent: boolean;
  created_at: string;
}

interface AlertPanelProps {
  visible: boolean;
  onClose: () => void;
}

const AlertPanel: React.FC<AlertPanelProps> = ({ visible, onClose }) => {
  const { devices } = useNetworkStore();
  const currentTheme = useTheme();
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertSettings, setAlertSettings] = useState<Record<string, boolean>>({});
  
  const isDark = currentTheme === 'dark';
  
  // Fetch alerts and alert settings when modal is opened
  useEffect(() => {
    if (visible) {
      fetchAlerts();
      fetchAlertSettings();
    }
  }, [visible]);
  
  // Fetch all alerts
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiConfig.baseUrl}/alerts`);
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch all alert settings
  const fetchAlertSettings = async () => {
    try {
      const response = await axios.get(`${apiConfig.baseUrl}/alerts/settings`);
      setAlertSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch alert settings:', error);
      setAlertSettings({});
    }
  };
  
  // Update device alert setting
  const updateAlertSetting = async (deviceId: string, enabled: boolean) => {
    try {
      await axios.post(`${apiConfig.baseUrl}/alerts/settings/${deviceId}`, { enabled });
      setAlertSettings(prev => ({
        ...prev,
        [deviceId]: enabled
      }));
    } catch (error) {
      console.error('Failed to update alert setting:', error);
    }
  };
  
  // Group alerts by device type
  const getAlertsByDeviceType = (type: string) => {
    return (alerts || []).filter(alert => alert.device_type === type);
  };
  
  // Get unique device types
  const deviceTypes = [...new Set((alerts || []).map(alert => alert.device_type))];
  
  // Get alert level color
  const getAlertLevelColor = (level: string) => {
    const colorMap: Record<string, string> = {
      info: 'green',
      warning: 'gold',
      error: 'red'
    };
    return colorMap[level as keyof typeof colorMap] || 'default';
  };
  
  // Alert columns
  const alertColumns = [
    {
      title: t('deviceName'),
      dataIndex: 'device_name',
      key: 'device_name',
    },
    {
      title: t('deviceIp'),
      dataIndex: 'device_ip',
      key: 'device_ip',
    },
    {
      title: t('alertType'),
      dataIndex: 'alert_type',
      key: 'alert_type',
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          'status': t('statusChange'),
          'ping': t('pingThreshold')
        };
        return typeMap[type] || type;
      }
    },
    {
      title: t('alertLevel'),
      dataIndex: 'alert_level',
      key: 'alert_level',
      render: (level: string) => (
        <Tag color={getAlertLevelColor(level)}>{level}</Tag>
      )
    },
    {
      title: t('alertMessage'),
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: t('sendStatus'),
      dataIndex: 'is_sent',
      key: 'is_sent',
      render: (sent: boolean) => (
        <Tag color={sent ? 'green' : 'red'}>{sent ? t('sent') : t('notSent')}</Tag>
      )
    },
    {
      title: t('createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleString(),
    },
  ];
  
  // IP地址排序函数
  const sortDevicesByIp = (devices: NetworkDevice[]) => {
    return [...devices].sort((a, b) => {
      if (!a.ip) return 1;
      if (!b.ip) return -1;
      
      const ipToNumber = (ip: string) => {
        return ip.split('.').reduce((acc, octet) => {
          return (acc << 8) + parseInt(octet, 10);
        }, 0);
      };
      
      return ipToNumber(a.ip) - ipToNumber(b.ip);
    });
  };

  // Build Tabs items using new API (instead of deprecated TabPane)
  const tabItems = [
    {
      key: 'all',
      label: t('allAlerts'),
      children: (
        <Table
          dataSource={alerts}
          columns={alertColumns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      ),
    },
    ...(deviceTypes || []).map(type => ({
      key: type,
      label: (
        <Space>
          <EyeOutlined />
          {(type || '').charAt(0).toUpperCase() + (type || '').slice(1)}
          <Tag color="blue">{getAlertsByDeviceType(type).length}</Tag>
        </Space>
      ),
      children: (
        <Table
          dataSource={getAlertsByDeviceType(type)}
          columns={alertColumns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      ),
    })),
  ];
  
  return (
    <Modal
      title={t('alertInfo')}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
    >
      <Tabs defaultActiveKey="all" items={tabItems} />
      
      {/* Device alert settings */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ color: isDark ? '#ffffff' : '#000000' }}>{t('alertDeviceSwitch')}</h3>
        <Space direction="vertical" style={{ width: '100%' }}>
          {sortDevicesByIp(devices || []).map(device => (
            <Card key={device.id} size="small">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <span>{device.label}</span>
                  <Tag color="gray">{device.type}</Tag>
                  <Tag>{device.ip || t('noIp')}</Tag>
                </Space>
                <Switch
                  checked={alertSettings[device.id] !== false}
                  onChange={(checked) => updateAlertSetting(device.id, checked)}
                  checkedChildren={t('enabled')}
                  unCheckedChildren={t('disabled')}
                />
              </div>
            </Card>
          ))}
        </Space>
      </div>
    </Modal>
  );
};

export default AlertPanel;
