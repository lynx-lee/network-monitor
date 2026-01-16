import React, { useEffect, useState } from 'react';
import { Layout, ConfigProvider, theme } from 'antd';
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
import type { DeviceType, NetworkDevice } from './types';
import './i18n/config'; // 引入i18n配置
import websocketService from './services/websocketService';

const { Sider, Content } = Layout;

function App() {
  const { addDevice, selectedDevice, updateDevice, deleteDevice, fetchAllData } = useNetworkStore();
  const { theme: configTheme, fetchConfig } = useConfigStore();
  const [configVisible, setConfigVisible] = React.useState(false);
  const [systemConfigVisible, setSystemConfigVisible] = React.useState(false);
  const [alertPanelVisible, setAlertPanelVisible] = React.useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
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
  
  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (configTheme === 'system') {
        setCurrentTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [configTheme]);
  
  // 监听配置主题变化
  useEffect(() => {
    if (configTheme === 'system') {
      setCurrentTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } else {
      setCurrentTheme(configTheme);
    }
  }, [configTheme]);
  
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

  const handleAddDevice = (type: DeviceType) => {
    // Add device at center of viewport
    addDevice(type, window.innerWidth / 4, window.innerHeight / 2);
  };

  const handleDeviceSelect = () => {
    if (selectedDevice) {
      setConfigVisible(true);
    }
  };

  React.useEffect(() => {
    handleDeviceSelect();
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
              trigger={null} // 隐藏默认触发器
            >
              {/* 自定义触发器，放在Sider外部 */}
              <div style={{ 
                position: 'absolute',
                top: 0,
                left: collapsed ? '20px' : '260px',
                color: currentTheme === 'dark' ? '#ffffff' : '#000000',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '20px',
                height: '64px',
                transition: 'all 0.3s ease',
                zIndex: 1000,
                backgroundColor: currentTheme === 'dark' ? '#0e263c' : '#fff',
                borderRight: `1px solid ${currentTheme === 'dark' ? '#1f3a5f' : '#e8e8e8'}`
              }}
              onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? '>' : '<'}
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
                  color: currentTheme === 'dark' ? '#ffffff' : '#000000'
                }}>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    正在加载网络数据...
                  </div>
                </div>
              )}
              <NetworkCanvas />
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
