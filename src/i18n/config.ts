import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 语言资源
const resources = {
  en: {
    translation: {
      // 通用
      cancel: 'Cancel',
      save: 'Save',
      status: 'Status',
      name: 'Name',
      language: 'Language',
      theme: 'Theme',
      interface: 'Interface',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      showMiniMap: 'Show Mini Map',
      showControls: 'Show Controls',
      showBackground: 'Show Background',
      
      // 设备配置
      deviceConfig: 'Device Configuration',
      deviceName: 'Device Name',
      pleaseInputDeviceName: 'Please input device name!',
      enterDeviceName: 'Enter device name',
      portConfiguration: 'Port Configuration',
      portCount: 'Port Count',
      enterPortCount: 'Enter port count',
      portName: 'Port Name',
      enterPortName: 'Port name',
      portType: 'Port Type',
      portTypeOptical: 'Optical',
      portTypeElectrical: 'Electrical',
      portRate: 'Port Rate (Mbps)',
      macAddress: 'MAC Address',
      enterMacAddress: 'MAC address',
      portStatus: 'Status',
      portStatusUp: 'Up',
      portStatusDown: 'Down',
      portStatusWarning: 'Warning',
      
      // 侧边栏
      networkMonitor: 'Network Monitor',
      dragDevicesToCanvas: 'Drag devices to canvas to create network topology',
      addDevices: 'Add Devices',
      deviceTypes: 'Device Types',
      instructions: 'Instructions',
      statusLegend: 'Status Legend',
      
      // 设备类型
      router: 'Router',
      switch: 'Switch',
      server: 'Server',
      vmHost: 'VM Host',
      wirelessRouter: 'Wireless Router',
      accessPoint: 'Access Point',
      opticalModem: 'Optical Modem',
      
      // 指令
      instruction1: '1. Add Devices: Click device buttons to add to canvas',
      instruction2: '2. Connect Devices: Drag from port handles to create connections between devices',
      instruction3: '3. Configure Device: Click on a device to open its configuration panel',
      instruction4: '4. System Settings: Click "System Configuration" to adjust global settings',
      instruction5: '5. Monitor: View real-time device status information',
      
      // 状态图例
      statusUp: 'Up',
      statusDown: 'Down',
      statusWarning: 'Warning',
      statusUnknown: 'Unknown',
      
      // 设备节点
      cpuUsage: 'CPU Usage',
      memoryUsage: 'Memory Usage',
      ports: 'Ports',
      // 系统配置
      systemConfig: 'System Configuration',
      enablePing: 'Enable Ping Detection',
      pingInterval: 'Ping Interval',
      pingIntervalDesc: 'Ping Interval (milliseconds)',
      enterPingInterval: 'Enter ping interval',
    }
  },
  zh: {
    translation: {
      // 通用
      cancel: '取消',
      save: '保存',
      status: '状态',
      name: '名称',
      language: '语言',
      theme: '主题',
      interface: '界面',
      light: '浅色',
      dark: '深色',
      system: '系统',
      showMiniMap: '显示小地图',
      showControls: '显示控制面板',
      showBackground: '显示背景网格',
      
      // 设备配置
      deviceConfig: '设备配置',
      deviceName: '设备名称',
      pleaseInputDeviceName: '请输入设备名称！',
      enterDeviceName: '输入设备名称',
      portConfiguration: '端口配置',
      portCount: '端口数量',
      enterPortCount: '输入端口数量',
      portName: '端口名称',
      enterPortName: '端口名称',
      portType: '端口类型',
      portTypeOptical: '光口',
      portTypeElectrical: '电口',
      portRate: '端口速率 (Mbps)',
      macAddress: 'MAC地址',
      enterMacAddress: 'MAC地址',
      portStatus: '状态',
      portStatusUp: '正常',
      portStatusDown: '关闭',
      portStatusWarning: '警告',
      
      // 侧边栏
      networkMonitor: '网络监控',
      dragDevicesToCanvas: '拖动设备到画布创建网络拓扑',
      addDevices: '添加设备',
      deviceTypes: '设备类型',
      instructions: '操作说明',
      statusLegend: '状态图例',
      
      // 设备类型
      router: '路由器',
      switch: '交换机',
      server: '服务器',
      vmHost: '虚拟机主机',
      wirelessRouter: '无线路由器',
      accessPoint: '接入点',
      opticalModem: '光猫',
      
      // 指令
      instruction1: '1. 添加设备：点击设备按钮添加到画布',
      instruction2: '2. 连接设备：从端口连接点拖动创建设备间连接',
      instruction3: '3. 配置设备：点击设备打开其配置面板',
      instruction4: '4. 系统设置：点击"系统配置"调整全局设置',
      instruction5: '5. 监控：查看实时设备状态信息',
      
      // 状态图例
      statusUp: '正常',
      statusDown: '关闭',
      statusWarning: '警告',
      statusUnknown: '未知',
      
      // 设备节点
      cpuUsage: 'CPU使用率',
      memoryUsage: '内存使用率',
      ports: '端口',
      // 系统配置
      systemConfig: '系统配置',
      enablePing: '启用Ping探测',
      pingInterval: 'Ping间隔',
      pingIntervalDesc: 'Ping间隔 (毫秒)',
      enterPingInterval: '输入Ping间隔',
    }
  }
};

// 初始化i18n
i18n
  .use(initReactI18next) // 集成React i18next
  .init({
    resources,
    lng: 'zh', // 默认语言
    fallbackLng: 'en', // 回退语言
    interpolation: {
      escapeValue: false // 不需要转义HTML
    }
  });

export default i18n;