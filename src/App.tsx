import React, { useState, useCallback } from 'react';
import { Layout, ConfigProvider, theme, Spin } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { ReactFlowProvider } from 'reactflow';
import './App.css';
import Sidebar from './components/Sidebar';
import NetworkCanvas from './components/NetworkCanvas';
import DeviceConfigPanel from './components/DeviceConfigPanel';
import ConfigPanel from './components/ConfigPanel';
import AlertPanel from './components/AlertPanel';
import ErrorBoundary from './components/ErrorBoundary';
import useNetworkStore from './store/networkStore';
import useConfigStore from './store/configStore';
import useTheme from './hooks/useTheme';
import type { DeviceType, NetworkDevice } from '../types';
import './i18n/config';
import websocketService from './services/websocketService';

const { Sider, Content } = Layout;

function App() {
  const { addDevice, selectedDevice, updateDevice, deleteDevice, fetchAllData } = useNetworkStore();
  const { fetchConfig } = useConfigStore();
  const currentTheme = useTheme();
  const [configVisible, setConfigVisible] = React.useState(false);
  const [systemConfigVisible, setSystemConfigVisible] = React.useState(false);
  const [alertPanelVisible, setAlertPanelVisible] = React.useState(false);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  
  // State for sidebar collapse/expand
  const [collapsed, setCollapsed] = useState(false);
  
  // 应用启动时加载配置和网络数据，并建立WebSocket连接
  React.useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsInitialLoaded(false);
        // 先加载配置，再加载网络数据
        await fetchConfig();
        await fetchAllData();
        setIsInitialLoaded(true);
      } catch (error) {
        console.error('Failed to load initial data:', error);
        setIsInitialLoaded(true);
      }
    };
    
    loadInitialData();
    
    // 建立WebSocket连接
    websocketService.connect();
    
    // 组件卸载时断开WebSocket连接
    return () => {
      websocketService.disconnect();
    };
  }, [fetchConfig, fetchAllData]);
  
  const handleOpenConfigPanel = () => {
    setSystemConfigVisible(true);
  };
  
  const handleCloseConfigPanel = () => {
    setSystemConfigVisible(false);
  };
  
  const handleOpenAlertPanel = () => {
    setAlertPanelVisible(true);
  };
  
  const handleCloseAlertPanel = () => {
    setAlertPanelVisible(false);
  };

  // #8: 新设备添加位置随机偏移，避免重叠
  const deviceCountRef = React.useRef(0);
  const handleAddDevice = useCallback((type: DeviceType) => {
    const baseX = window.innerWidth / 4;
    const baseY = window.innerHeight / 2;
    const offset = deviceCountRef.current * 40;
    deviceCountRef.current += 1;
    addDevice(type, baseX + offset + Math.random() * 60 - 30, baseY + offset + Math.random() * 60 - 30);
  }, [addDevice]);

  // #7: 只在用户明确双击设备时打开配置面板，单击仅选中
  const handleDeviceDoubleClick = useCallback(() => {
    if (selectedDevice) {
      setConfigVisible(true);
    }
  }, [selectedDevice]);

  const handleConfigClose = () => {
    setConfigVisible(false);
  };

  const handleConfigSave = async (device: NetworkDevice) => {
    return await updateDevice(device);
  };

  const handleDeleteDevice = () => {
    if (selectedDevice) {
      deleteDevice(selectedDevice.id);
      setConfigVisible(false);
    }
  };

  return (
    <ErrorBoundary>
      <ConfigProvider
        theme={{
          algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            // 自定义主题令牌，同时应用于浅色和深色主题
            colorPrimary: '#1890ff',
            ...(currentTheme === 'dark' && {
              // 仅在深色主题下应用的令牌
              colorBgContainer: '#0a1929',
              colorBgLayout: '#051221',
              colorBgElevated: '#0e263c',
              colorText: '#ffffff',
              colorTextSecondary: '#a0b1c5',
              colorTextPlaceholder: '#64768b',
              colorBorder: '#1f3a5f',
              colorBgSplit: '#1f3a5f',
              colorBgButton: '#1890ff',
              colorBgButtonHover: '#40a9ff',
              colorBgButtonActive: '#096dd9',
            })
          }
        }}
      >
        <ReactFlowProvider>
          <Layout style={{ height: '100vh' }}>
            <Sider 
              collapsible 
              collapsed={collapsed} 
              onCollapse={setCollapsed}
              width={280}
              collapsedWidth={80}
              style={{ 
                backgroundColor: currentTheme === 'dark' ? '#0e263c' : '#fff',
                transition: 'all 0.3s ease'
              }}
              trigger={null}
            >
              {/* 美化的折叠触发器 */}
              <div 
                className="sidebar-collapse-trigger"
                style={{ 
                  position: 'absolute',
                  top: '50%',
                  right: '-16px',
                  transform: 'translateY(-50%)',
                  color: currentTheme === 'dark' ? '#a0b1c5' : '#595959',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '16px',
                  height: '48px',
                  transition: 'all 0.3s ease',
                  zIndex: 1000,
                  backgroundColor: currentTheme === 'dark' ? '#0e263c' : '#fff',
                  borderRadius: '0 6px 6px 0',
                  border: `1px solid ${currentTheme === 'dark' ? '#1f3a5f' : '#e8e8e8'}`,
                  borderLeft: 'none',
                  boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)',
                }}
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </div>
            
            <Sidebar 
              onAddDevice={handleAddDevice} 
              onOpenConfigPanel={handleOpenConfigPanel} 
              onOpenAlertPanel={handleOpenAlertPanel}
              collapsed={collapsed}
            />
          </Sider>
          <Layout>
            <Content style={{ padding: 0, overflow: 'hidden' }}>
              {!isInitialLoaded && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  backgroundColor: currentTheme === 'dark' ? '#051221' : '#f0f2f5',
                  color: currentTheme === 'dark' ? '#ffffff' : '#000000',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 100,
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Spin size="large" />
                    <div style={{ marginTop: '16px', fontSize: '16px', color: currentTheme === 'dark' ? '#a0b1c5' : '#666' }}>
                      正在加载网络数据...
                    </div>
                  </div>
                </div>
              )}
              <NetworkCanvas onDeviceDoubleClick={handleDeviceDoubleClick} />
            </Content>
          </Layout>
          <DeviceConfigPanel
            device={selectedDevice}
            visible={configVisible}
            onClose={handleConfigClose}
            onSave={handleConfigSave}
            onDelete={handleDeleteDevice}
          />
          <ConfigPanel
            visible={systemConfigVisible}
            onClose={handleCloseConfigPanel}
          />
          <AlertPanel
            visible={alertPanelVisible}
            onClose={handleCloseAlertPanel}
          />
        </Layout>
      </ReactFlowProvider>
    </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
