import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space, InputNumber, Card, Divider, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { NetworkDevice, DevicePort, VirtualMachine } from '../../types';
import useTheme from '../hooks/useTheme';

const { Option } = Select;

interface DeviceConfigPanelProps {
  device: NetworkDevice | null;
  visible: boolean;
  onClose: () => void;
  onSave: (device: NetworkDevice) => Promise<boolean>;
  onDelete: () => void;
}

const DeviceConfigPanel: React.FC<DeviceConfigPanelProps> = ({ device, visible, onClose, onSave, onDelete }) => {
  const { t } = useTranslation();
  const currentTheme = useTheme();
  const [form] = Form.useForm();
  const [portCount, setPortCount] = useState(0);
  const [ports, setPorts] = useState<DevicePort[]>([]);
  const [virtualMachines, setVirtualMachines] = useState<VirtualMachine[]>([]);
  
  // 主题样式配置
  const isDark = currentTheme === 'dark';
  const cardBg = isDark ? '#0e263c' : '#fff';
  const inputBg = isDark ? '#0a1929' : '#fff';
  const borderColor = isDark ? '#1f3a5f' : '#d9d9d9';
  const textColor = isDark ? '#ffffff' : '#000000';

  useEffect(() => {
    if (device) {
      setPortCount((device.ports || []).length);
      // 当device变化时，总是更新ports状态为新设备的端口信息
      setPorts(device.ports || []);
      // Initialize virtual machines if it's a VM host
      setVirtualMachines(device.virtualMachines || []);
      form.setFieldsValue({
        label: device.label,
        ip: device.ip,
        mac: device.mac,
      });
    }
  }, [device, form]);

  const handlePortCountChange = (count: number) => {
    setPortCount(count);
    
    // Update ports array based on new count
    const newPorts = [...ports];
    
    if (count > newPorts.length) {
      // Add new ports
      for (let i = newPorts.length; i < count; i++) {
        newPorts.push({
          id: `port-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`, // 确保端口id唯一
          name: `${t('portName')} ${i + 1}`,
          type: 'electrical', // Default to electrical port
          rate: 1000, // Default rate 1000 Mbps
          mac: generateRandomMAC(),
          status: 'up',
          trafficIn: 0,
          trafficOut: 0,
        });
      }
    } else if (count < newPorts.length) {
      // Remove extra ports
      newPorts.splice(count);
    }
    
    setPorts(newPorts);
  };

  const handlePortChange = (index: number, field: keyof DevicePort, value: any) => {
    const newPorts = [...ports];
    newPorts[index] = {
      ...newPorts[index],
      [field]: value,
    };
    setPorts(newPorts);
  };

  const generateRandomMAC = () => {
    return Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':');
  };

  // Virtual Machine handling functions
  const addVirtualMachine = () => {
    const newVM: VirtualMachine = {
      name: `VM ${(virtualMachines || []).length + 1}`,
      ip: '',
      status: 'unknown',
      pingTime: undefined
    };
    setVirtualMachines([...(virtualMachines || []), newVM]);
  };

  const removeVirtualMachine = (index: number) => {
    const newVMs = [...virtualMachines];
    newVMs.splice(index, 1);
    setVirtualMachines(newVMs);
  };

  const updateVirtualMachine = (index: number, field: keyof VirtualMachine, value: any) => {
    const newVMs = [...virtualMachines];
    newVMs[index] = {
      ...newVMs[index],
      [field]: value
    };
    setVirtualMachines(newVMs);
  };

  const handleSave = async () => {
    if (device) {
      try {
        // 先进行表单验证
        await form.validateFields();
        
        // 获取表单字段值，允许为空字符串
        const values = form.getFieldsValue();
        const label = values.label;
        const ip = values.ip;
        const mac = values.mac;
        
        console.log('Form values:', values);
        
        const updatedDevice: NetworkDevice = {
          ...device,
          label: label !== undefined ? label : device.label,
          ip: ip !== undefined ? ip : device.ip,
          mac: mac !== undefined ? mac : device.mac,
          ports: ports,
          virtualMachines: device.type === 'vm_host' ? virtualMachines : undefined,
        };
        
        // 确保ports数组中的每个端口都有正确的属性
        updatedDevice.ports = updatedDevice.ports.map(port => ({
          id: port.id,
          name: port.name || '',
          type: port.type || 'electrical',
          rate: port.rate || 1000,
          mac: port.mac || '',
          status: port.status || 'up',
          trafficIn: port.trafficIn || 0,
          trafficOut: port.trafficOut || 0
        }));
        
        // 确保virtualMachines数组中的每个虚拟机都有正确的属性
        if (updatedDevice.virtualMachines) {
          updatedDevice.virtualMachines = updatedDevice.virtualMachines.map(vm => ({
            name: vm.name || '',
            ip: vm.ip || '',
            status: vm.status || 'unknown',
            pingTime: vm.pingTime || undefined
          }));
        }
        
        console.log('Saving device:', updatedDevice.id);
        console.log('Device ports:', updatedDevice.ports);
        console.log('Device virtual machines:', updatedDevice.virtualMachines);
        
        // 等待保存完成后再关闭
        console.log('Calling onSave with device:', updatedDevice);
        const saveResult = await onSave(updatedDevice);
        console.log('Save result:', saveResult);
      if (saveResult) {
        onClose();
      } else {
        console.error('Save failed, not closing panel');
      }
      } catch (error) {
        console.error('Form validation failed:', error);
        // 表单验证失败，不关闭面板
      }
    }
  };

  if (!device) return null;

  return (
    <Modal
      title={t('deviceConfig')}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          label: device.label,
          ip: device.ip,
          mac: device.mac,
        }}
        style={{ color: textColor }}
      >
        <Form.Item
          name="label"
          label={t('deviceName')}
          rules={[{ required: true, message: t('pleaseInputDeviceName') }]}
          style={{ color: textColor }}
        >
          <Input 
            placeholder={t('enterDeviceName')} 
            size="large"
            style={{ 
              fontSize: '16px', 
              padding: '10px',
              backgroundColor: inputBg,
              border: `1px solid ${borderColor}`,
              color: textColor
            }}
          />
        </Form.Item>

        <Form.Item
          name="ip"
          label="IP地址"
          rules={[
            { required: false, message: '请输入IP地址！' },
            { 
              pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
              message: '请输入有效的IPv4地址（例如：192.168.1.1）',
              validateTrigger: 'onBlur',
              transform: (value) => value?.trim() || ''
            }
          ]}
          style={{ color: textColor }}
        >
          <Input 
            placeholder="输入IP地址（可选）"
            size="large"
            style={{ 
              fontSize: '16px', 
              padding: '10px',
              backgroundColor: inputBg,
              border: `1px solid ${borderColor}`,
              color: textColor
            }}
          />
        </Form.Item>

        <Form.Item
          name="mac"
          label="MAC地址"
          rules={[{ required: false, message: '请输入MAC地址！' }]}
          style={{ color: textColor }}
        >
          <Input 
            placeholder="输入MAC地址（可选）"
            size="large"
            style={{ 
              fontSize: '16px', 
              padding: '10px',
              backgroundColor: inputBg,
              border: `1px solid ${borderColor}`,
              color: textColor
            }}
          />
        </Form.Item>

        <Divider style={{ backgroundColor: borderColor }}>{t('portConfiguration')}</Divider>
        
        <Form.Item label={t('portCount')} style={{ color: textColor }}>
          <InputNumber
            min={1}
            max={32}
            value={portCount}
            onChange={(value) => value && handlePortCountChange(value)}
            style={{ 
              width: '100%',
              backgroundColor: inputBg,
              border: `1px solid ${borderColor}`,
              color: textColor
            }}
            placeholder={t('enterPortCount')}
            size="large"
          />
        </Form.Item>

        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto', 
          padding: '8px', 
          borderRadius: '8px', 
          backgroundColor: isDark ? '#0a1929' : '#f5f5f5', 
          margin: '16px 0',
          border: `1px solid ${borderColor}`
        }}>
          {ports.map((port, index) => (
            <Card 
              key={port.id} 
              size="small" 
              style={{ 
                marginBottom: '12px', 
                borderRadius: '8px', 
                boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.08)', 
                transition: 'all 0.3s ease',
                backgroundColor: cardBg,
                border: `1px solid ${borderColor}`,
                color: textColor
              }}
              hoverable
            >
              <Space orientation="horizontal" style={{ width: '100%', gap: '16px', flexWrap: 'nowrap' }}>
                <Form.Item label={t('portName')} style={{ marginBottom: 0, flex: 0.8, color: textColor }}>
                  <Input
                    value={port.name}
                    onChange={(e) => handlePortChange(index, 'name', e.target.value)}
                    placeholder={t('enterPortName')}
                    style={{ 
                      width: '100%', 
                      borderRadius: '6px',
                      backgroundColor: inputBg,
                      border: `1px solid ${borderColor}`,
                      color: textColor
                    }}
                    size="large"
                  />
                </Form.Item>
                
                <Form.Item label={t('portType')} style={{ marginBottom: 0, flex: 1, color: textColor }}>
                  <Select
                    value={port.type}
                    onChange={(value) => handlePortChange(index, 'type', value)}
                    style={{ 
                      width: '100%', 
                      borderRadius: '6px', 
                      minWidth: '120px',
                      backgroundColor: inputBg,
                      border: `1px solid ${borderColor}`,
                      color: textColor
                    }}
                    size="large"
                    dropdownStyle={{ 
                      backgroundColor: cardBg, 
                      border: `1px solid ${borderColor}`,
                      color: textColor
                    }}
                  >
                    <Option value="electrical" style={{ color: textColor }}>{t('portTypeElectrical')}</Option>
                    <Option value="optical" style={{ color: textColor }}>{t('portTypeOptical')}</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item label={t('portRate')} style={{ marginBottom: 0, flex: 1, color: textColor }}>
                  <Select
                    value={port.rate}
                    onChange={(value) => handlePortChange(index, 'rate', value)}
                    style={{ 
                      width: '100%', 
                      borderRadius: '6px', 
                      minWidth: '140px',
                      backgroundColor: inputBg,
                      border: `1px solid ${borderColor}`,
                      color: textColor
                    }}
                    size="large"
                    dropdownStyle={{ 
                      backgroundColor: cardBg, 
                      border: `1px solid ${borderColor}`,
                      color: textColor
                    }}
                  >
                    <Option value={100} style={{ color: textColor }}>100 Mbps</Option>
                    <Option value={1000} style={{ color: textColor }}>1 Gbps</Option>
                    <Option value={2500} style={{ color: textColor }}>2.5 Gbps</Option>
                    <Option value={10000} style={{ color: textColor }}>10 Gbps</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item label={t('macAddress')} style={{ marginBottom: 0, flex: 1.5, color: textColor }}>
                  <Input
                    value={port.mac}
                    onChange={(e) => handlePortChange(index, 'mac', e.target.value)}
                    placeholder={t('enterMacAddress')}
                    style={{ 
                      width: '100%', 
                      borderRadius: '6px',
                      backgroundColor: inputBg,
                      border: `1px solid ${borderColor}`,
                      color: textColor
                    }}
                    size="large"
                  />
                </Form.Item>
                
                <Form.Item label={t('status')} style={{ marginBottom: 0, flex: 1, color: textColor }}>
                  <Select
                    value={port.status}
                    onChange={(value) => handlePortChange(index, 'status', value)}
                    style={{ 
                      width: '100%', 
                      borderRadius: '6px', 
                      minWidth: '120px',
                      backgroundColor: inputBg,
                      border: `1px solid ${borderColor}`,
                      color: textColor
                    }}
                    size="large"
                    dropdownStyle={{ 
                      backgroundColor: cardBg, 
                      border: `1px solid ${borderColor}`,
                      color: textColor
                    }}
                  >
                    <Option value="up" style={{ color: textColor }}>{t('portStatusUp')}</Option>
                    <Option value="down" style={{ color: textColor }}>{t('portStatusDown')}</Option>
                    <Option value="warning" style={{ color: textColor }}>{t('portStatusWarning')}</Option>
                  </Select>
                </Form.Item>
              </Space>
            </Card>
          ))}
        </div>

        {/* Virtual Machines Configuration - only for VM Host devices */}
        {device.type === 'vm_host' && (
          <>
            <Divider style={{ backgroundColor: borderColor }}>虚拟机配置</Divider>
            
            <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: textColor, fontSize: '16px' }}>虚拟机列表</h3>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addVirtualMachine}
                style={{
                  borderRadius: '6px',
                  borderColor,
                  color: textColor,
                  padding: '6px 16px',
                  fontSize: '14px'
                }}
              >
                添加虚拟机
              </Button>
            </Space>
            
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              padding: '8px', 
              borderRadius: '8px', 
              backgroundColor: isDark ? '#0a1929' : '#f5f5f5', 
              margin: '16px 0',
              border: `1px solid ${borderColor}`
            }}>
              {virtualMachines.map((vm, index) => (
                <Card 
                  key={`vm-${index}`} 
                  size="small" 
                  style={{ 
                    marginBottom: '12px', 
                    borderRadius: '8px', 
                    boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.08)', 
                    transition: 'all 0.3s ease',
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    color: textColor
                  }}
                  hoverable
                >
                  <Space orientation="horizontal" style={{ width: '100%', gap: '16px', flexWrap: 'nowrap', alignItems: 'center' }}>
                    <Button
                      type="text"
                      danger
                      size="small"
                      onClick={() => removeVirtualMachine(index)}
                      style={{ padding: '0 8px', fontSize: '12px', fontWeight: 'bold' }}
                    >
                      删除
                    </Button>
                    
                    <Form.Item label="虚拟机名称" style={{ marginBottom: 0, flex: 1, color: textColor }}>
                      <Input
                        value={vm.name}
                        onChange={(e) => updateVirtualMachine(index, 'name', e.target.value)}
                        placeholder="输入虚拟机名称"
                        style={{ 
                          width: '100%', 
                          borderRadius: '6px',
                          backgroundColor: inputBg,
                          border: `1px solid ${borderColor}`,
                          color: textColor
                        }}
                        size="large"
                      />
                    </Form.Item>
                    
                    <Form.Item 
                      label="IP地址" 
                      style={{ marginBottom: 0, flex: 1.5, color: textColor }}
                      rules={[
                        { required: true, message: '请输入虚拟机IP地址！' },
                        { 
                          pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
                          message: '请输入有效的IPv4地址（例如：192.168.1.1）',
                          validateTrigger: 'onBlur'
                        }
                      ]}
                    >
                      <Input
                        value={vm.ip}
                        onChange={(e) => updateVirtualMachine(index, 'ip', e.target.value)}
                        placeholder="输入虚拟机IP地址"
                        style={{ 
                          width: '100%', 
                          borderRadius: '6px',
                          backgroundColor: inputBg,
                          border: `1px solid ${borderColor}`,
                          color: textColor
                        }}
                        size="large"
                      />
                    </Form.Item>
                  </Space>
                </Card>
              ))}
              
              {(virtualMachines || []).length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  color: currentTheme === 'dark' ? '#a0b1c5' : '#666666', 
                  padding: '20px',
                  fontSize: '14px'
                }}>
                  暂无虚拟机，点击"添加虚拟机"按钮创建
                </div>
              )}
            </div>
          </>
        )}

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: '24px' }}>
            <Button 
              onClick={onClose} 
              style={{ 
                borderRadius: '6px', 
                padding: '8px 24px', 
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
            >
              {t('cancel')}
            </Button>
            <Button 
              type="primary" 
              onClick={handleSave} 
              style={{ 
                borderRadius: '6px', 
                padding: '8px 24px', 
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
            >
              {t('save')}
            </Button>
            <Popconfirm
              title="确定要删除此设备吗？"
              description="删除后无法恢复，设备的所有连接也将被移除。"
              onConfirm={onDelete}
              okText="确定删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button 
                type="primary" 
                danger 
                style={{ 
                  borderRadius: '6px', 
                  padding: '8px 24px', 
                  fontSize: '16px',
                  transition: 'all 0.3s ease'
                }}
              >
                {t('delete')}
              </Button>
            </Popconfirm>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DeviceConfigPanel;