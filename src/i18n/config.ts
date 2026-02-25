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
      
      // 告警
      alertInfo: 'Alerts',
      alertDeviceSwitch: 'Device Alert Settings',
      lockCanvas: 'Lock Canvas',
      compactNodes: 'Compact Nodes',
      delete: 'Delete',

      // ConfigPanel - ServerChan
      enableServerChanPush: 'Enable ServerChan Push',
      enterServerChanSendKey: 'Enter ServerChan SendKey',
      serverChanOptional: 'Optional, depends on ServerChan version',
      serverChanPassword: 'ServerChan Password',

      // ConfigPanel - Alert thresholds
      alertThreshold: 'Alert Thresholds',
      warningPingThreshold: 'Warning Ping Threshold (ms)',
      criticalPingThreshold: 'Critical Ping Threshold (ms)',
      maxAlertsPerDay: 'Max Alerts Per Day',
      consecutiveFailCount: 'Consecutive Failure Count',
      consecutiveFailDesc: 'Alert notification triggers after this many consecutive detection failures',
      times: 'times',

      // ConfigPanel - Message templates
      messageTemplate: 'Message Templates',
      templateList: 'Template List',
      addTemplate: 'Add Template',
      editTemplate: 'Edit Template',
      edit: 'Edit',
      templateName: 'Template Name',
      enterTemplateName: 'Enter template name',
      messageLevel: 'Message Level',
      selectMessageLevel: 'Select message level',
      levelInfo: 'Info',
      levelWarning: 'Warning',
      levelError: 'Error',
      messageTitle: 'Message Title',
      enterMessageTitle: 'Enter message title',
      messageContent: 'Message Content',
      enterMessageContent: 'Enter message content, supports {{deviceName}}, {{deviceIp}} and other template variables',
      enableTemplate: 'Enable Template',
      update: 'Update',
      add: 'Add',
      confirmDeleteTemplate: 'Are you sure you want to delete this template?',
      confirm: 'Confirm',
      availableVariables: 'Available Variables:',
      portRateOptions: 'Port Rate Options (Mbps)',

      // AlertPanel
      deviceIp: 'Device IP',
      alertType: 'Alert Type',
      statusChange: 'Status Change',
      pingThreshold: 'Ping Threshold',
      alertLevel: 'Alert Level',
      alertMessage: 'Alert Message',
      sendStatus: 'Send Status',
      sent: 'Sent',
      notSent: 'Not Sent',
      createdAt: 'Created At',
      allAlerts: 'All Alerts',
      noIp: 'No IP',
      enabled: 'On',
      disabled: 'Off',

      // DeviceConfigPanel
      ipAddress: 'IP Address',
      pleaseInputIpAddress: 'Please input IP address!',
      invalidIpv4: 'Please enter a valid IPv4 address (e.g. 192.168.1.1)',
      enterIpOptional: 'Enter IP address (optional)',
      pleaseInputMacAddress: 'Please input MAC address!',
      enterMacOptional: 'Enter MAC address (optional)',
      vmConfiguration: 'Virtual Machine Configuration',
      vmList: 'Virtual Machine List',
      addVm: 'Add VM',
      vmName: 'VM Name',
      enterVmName: 'Enter VM name',
      pleaseInputVmIp: 'Please input VM IP address!',
      enterVmIp: 'Enter VM IP address',
      noVmHint: 'No virtual machines yet. Click "Add VM" to create one.',
      confirmDeleteDevice: 'Are you sure you want to delete this device?',
      deleteDeviceWarning: 'This action cannot be undone. All connections of this device will also be removed.',
      confirmDelete: 'Confirm Delete',

      // NetworkCanvas
      noDevices: 'No Devices',
      noDevicesHint: 'Add devices from the left menu to start building your network topology',
      noDevicesSubHint: 'Supports routers, switches, servers and many other device types',
      deleteConnection: 'Delete Connection',
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
      
      // 告警
      alertInfo: '告警信息',
      alertDeviceSwitch: '设备告警开关',
      lockCanvas: '锁定画布',
      compactNodes: '精简节点',
      delete: '删除',

      // ConfigPanel - ServerChan
      enableServerChanPush: '启用 ServerChan 消息推送',
      enterServerChanSendKey: '请输入ServerChan SendKey',
      serverChanOptional: '可选，根据ServerChan版本而定',
      serverChanPassword: 'ServerChan 密码',

      // ConfigPanel - 告警阈值
      alertThreshold: '告警阈值',
      warningPingThreshold: '警告级 Ping 阈值 (ms)',
      criticalPingThreshold: '严重级 Ping 阈值 (ms)',
      maxAlertsPerDay: '每天最大告警次数',
      consecutiveFailCount: '连续异常探测次数',
      consecutiveFailDesc: '设备连续探测异常达到此次数后才触发告警通知',
      times: '次',

      // ConfigPanel - 消息模板
      messageTemplate: '消息模板',
      templateList: '消息模板列表',
      addTemplate: '添加模板',
      editTemplate: '编辑消息模板',
      edit: '编辑',
      templateName: '模板名称',
      enterTemplateName: '请输入模板名称',
      messageLevel: '消息级别',
      selectMessageLevel: '请选择消息级别',
      levelInfo: '信息',
      levelWarning: '警告',
      levelError: '错误',
      messageTitle: '消息标题',
      enterMessageTitle: '请输入消息标题',
      messageContent: '消息内容',
      enterMessageContent: '请输入消息内容，支持使用{{deviceName}}、{{deviceIp}}等标签变量',
      enableTemplate: '启用模板',
      update: '更新',
      add: '添加',
      confirmDeleteTemplate: '确定要删除这个模板吗？',
      confirm: '确定',
      availableVariables: '可用标签变量：',
      portRateOptions: '端口速率选项 (Mbps)',

      // AlertPanel
      deviceIp: '设备IP',
      alertType: '告警类型',
      statusChange: '状态变化',
      pingThreshold: 'Ping阈值',
      alertLevel: '告警级别',
      alertMessage: '告警信息',
      sendStatus: '发送状态',
      sent: '已发送',
      notSent: '未发送',
      createdAt: '创建时间',
      allAlerts: '所有告警',
      noIp: '无IP',
      enabled: '开启',
      disabled: '关闭',

      // DeviceConfigPanel
      ipAddress: 'IP地址',
      pleaseInputIpAddress: '请输入IP地址！',
      invalidIpv4: '请输入有效的IPv4地址（例如：192.168.1.1）',
      enterIpOptional: '输入IP地址（可选）',
      pleaseInputMacAddress: '请输入MAC地址！',
      enterMacOptional: '输入MAC地址（可选）',
      vmConfiguration: '虚拟机配置',
      vmList: '虚拟机列表',
      addVm: '添加虚拟机',
      vmName: '虚拟机名称',
      enterVmName: '输入虚拟机名称',
      pleaseInputVmIp: '请输入虚拟机IP地址！',
      enterVmIp: '输入虚拟机IP地址',
      noVmHint: '暂无虚拟机，点击"添加虚拟机"按钮创建',
      confirmDeleteDevice: '确定要删除此设备吗？',
      deleteDeviceWarning: '删除后无法恢复，设备的所有连接也将被移除。',
      confirmDelete: '确定删除',

      // NetworkCanvas
      noDevices: '暂无设备',
      noDevicesHint: '请从左侧菜单添加设备，开始构建您的网络拓扑',
      noDevicesSubHint: '支持路由器、交换机、服务器等多种设备类型',
      deleteConnection: '删除连接',
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