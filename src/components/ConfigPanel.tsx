import React, { useState, useCallback, useRef } from 'react';
import { Modal, Switch, Select, Card, Space, Divider, InputNumber, Input, Button, Form, Table, Popconfirm, Row, Col, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useConfigStore from '../store/configStore';
import type { MessageTemplate } from '../store/configStore';

const { Option } = Select;

interface ConfigPanelProps {
  visible: boolean;
  onClose: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();

  // Debounced update helper for InputNumber fields
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const debouncedUpdate = useCallback((key: string, fn: (v: number) => void, value: number) => {
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    debounceTimers.current[key] = setTimeout(() => fn(value), 500);
  }, []);

  const {
    // Existing configs
    language,
    theme,
    showMiniMap,
    showControls,
    showBackground,
    lockCanvas,
    enablePing,
    pingInterval,
    portRates,
    
    // ServerChan configs
    enableServerChan,
    serverChanSendKey,
    serverChanApiUrl,
    serverChanUid,
    serverChanPassword,
    
    // Alert thresholds
    warningPingThreshold,
    criticalPingThreshold,
    
    // Message templates
    messageTemplates,
    
    // Existing actions
    updateLanguage,
    updateTheme,
    toggleMiniMap,
    toggleControls,
    toggleBackground,
    toggleCanvasLock,
    togglePing,
    updatePingInterval,
    updatePortRates,
    
    // ServerChan actions
    toggleServerChan,
    updateServerChanSendKey,
    updateServerChanApiUrl,
    updateServerChanUid,
    updateServerChanPassword,
    
    // Alert threshold actions
    updateWarningPingThreshold,
    updateCriticalPingThreshold,
    alertMaxCountPerDay,
    updateAlertMaxCountPerDay,
    alertConsecutiveFailThreshold,
    updateAlertConsecutiveFailThreshold,
    
    // Message template actions
    addMessageTemplate,
    updateMessageTemplate,
    deleteMessageTemplate,
  } = useConfigStore();
  
  // Form states
  const [form] = Form.useForm<MessageTemplate>();
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);

  return (
    <Modal
      title={t('systemConfig')}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Tabs
        defaultActiveKey="general"
        tabPosition="left"
        style={{ minHeight: 400 }}
        items={[
          {
            key: 'general',
            label: t('interface'),
            children: (
              <div>
                <h4>{t('language')}</h4>
                <Select
                  value={language}
                  onChange={updateLanguage}
                  style={{ width: '100%', marginBottom: 16 }}
                >
                  <Option value="en">English</Option>
                  <Option value="zh">中文</Option>
                </Select>

                <h4>{t('theme')}</h4>
                <Select
                  value={theme}
                  onChange={updateTheme}
                  style={{ width: '100%', marginBottom: 16 }}
                >
                  <Option value="light">{t('light')}</Option>
                  <Option value="dark">{t('dark')}</Option>
                  <Option value="system">{t('system')}</Option>
                </Select>

                <Divider />

                <Space direction="vertical" style={{ width: '100%' }}>
                  <Card size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t('showMiniMap')}</span>
                      <Switch checked={showMiniMap} onChange={toggleMiniMap} />
                    </div>
                  </Card>
                  <Card size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t('showControls')}</span>
                      <Switch checked={showControls} onChange={toggleControls} />
                    </div>
                  </Card>
                  <Card size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t('showBackground')}</span>
                      <Switch checked={showBackground} onChange={toggleBackground} />
                    </div>
                  </Card>
                  <Card size="small">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{t('lockCanvas')}</span>
                      <Switch checked={lockCanvas} onChange={toggleCanvasLock} />
                    </div>
                  </Card>
                </Space>
              </div>
            ),
          },
          {
            key: 'ping',
            label: 'Ping',
            children: (
              <div>
                <Card size="small" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span>{t('enablePing')}</span>
                    <Switch checked={enablePing} onChange={togglePing} />
                  </div>
                  <div>
                    <span style={{ marginBottom: '8px', display: 'block' }}>{t('pingIntervalDesc')}</span>
                    <InputNumber
                      value={pingInterval}
                      onChange={(value) => value && debouncedUpdate('pingInterval', updatePingInterval, value)}
                      style={{ width: '100%' }}
                      placeholder={t('enterPingInterval')}
                      min={1000}
                      max={30000}
                      step={1000}
                      size="large"
                      disabled={!enablePing}
                    />
                  </div>
                </Card>

                <Card size="small">
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ marginBottom: '8px', display: 'block' }}>Port Rate Options (Mbps)</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {[100, 1000, 2500, 10000].map((rate) => (
                        <label key={rate} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: portRates.includes(rate) ? '#e6f7ff' : '#f5f5f5', borderRadius: '4px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={portRates.includes(rate)}
                            onChange={(e) => {
                              const newRates = e.target.checked 
                                ? [...portRates, rate].sort((a, b) => a - b)
                                : portRates.filter(r => r !== rate);
                              updatePortRates(newRates);
                            }}
                          />
                          {rate} Mbps
                        </label>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            ),
          },
          {
            key: 'serverchan',
            label: 'ServerChan',
            children: (
              <Card size="small" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span>启用 ServerChan 消息推送</span>
                  <Switch checked={enableServerChan} onChange={toggleServerChan} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <span style={{ marginBottom: '8px', display: 'block' }}>ServerChan API URL</span>
                    <Input
                      value={serverChanApiUrl}
                      onChange={(e) => updateServerChanApiUrl(e.target.value)}
                      style={{ width: '100%' }}
                      disabled={!enableServerChan}
                    />
                  </div>
                  
                  <div>
                    <span style={{ marginBottom: '8px', display: 'block' }}>ServerChan SendKey</span>
                    <Input.Password
                      value={serverChanSendKey}
                      onChange={(e) => updateServerChanSendKey(e.target.value)}
                      style={{ width: '100%' }}
                      disabled={!enableServerChan}
                      placeholder="请输入ServerChan SendKey"
                    />
                  </div>
                  
                  <div>
                    <span style={{ marginBottom: '8px', display: 'block' }}>ServerChan UID</span>
                    <Input
                      value={serverChanUid}
                      onChange={(e) => updateServerChanUid(e.target.value)}
                      style={{ width: '100%' }}
                      disabled={!enableServerChan}
                      placeholder="可选，根据ServerChan版本而定"
                    />
                  </div>
                  
                  <div>
                    <span style={{ marginBottom: '8px', display: 'block' }}>ServerChan 密码</span>
                    <Input.Password
                      value={serverChanPassword}
                      onChange={(e) => updateServerChanPassword(e.target.value)}
                      style={{ width: '100%' }}
                      disabled={!enableServerChan}
                      placeholder="可选，根据ServerChan版本而定"
                    />
                  </div>
                </div>
              </Card>
            ),
          },
          {
            key: 'alert',
            label: '告警阈值',
            children: (
              <Card size="small" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span>警告级 Ping 阈值 (ms)</span>
                      <span style={{ color: '#faad14' }}>{warningPingThreshold} ms</span>
                    </div>
                    <InputNumber
                      value={warningPingThreshold}
                      onChange={(value) => value && debouncedUpdate('warningPing', updateWarningPingThreshold, value)}
                      style={{ width: '100%' }}
                      min={1}
                      max={1000}
                      step={10}
                      size="large"
                    />
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span>严重级 Ping 阈值 (ms)</span>
                      <span style={{ color: '#ff4d4f' }}>{criticalPingThreshold} ms</span>
                    </div>
                    <InputNumber
                      value={criticalPingThreshold}
                      onChange={(value) => value && debouncedUpdate('criticalPing', updateCriticalPingThreshold, value)}
                      style={{ width: '100%' }}
                      min={1}
                      max={5000}
                      step={50}
                      size="large"
                    />
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span>每天最大告警次数</span>
                      <span style={{ color: '#1890ff' }}>{alertMaxCountPerDay} 次</span>
                    </div>
                    <InputNumber
                      value={alertMaxCountPerDay}
                      onChange={(value) => value && debouncedUpdate('alertMax', updateAlertMaxCountPerDay, value)}
                      style={{ width: '100%' }}
                      min={1}
                      max={1000}
                      step={10}
                      size="large"
                    />
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span>连续异常探测次数</span>
                      <span style={{ color: '#722ed1' }}>{alertConsecutiveFailThreshold} 次</span>
                    </div>
                    <div style={{ color: '#8c8c8c', fontSize: '12px', marginBottom: '8px' }}>
                      设备连续探测异常达到此次数后才触发告警通知
                    </div>
                    <InputNumber
                      value={alertConsecutiveFailThreshold}
                      onChange={(value) => value && debouncedUpdate('consecutiveFail', updateAlertConsecutiveFailThreshold, value)}
                      style={{ width: '100%' }}
                      min={1}
                      max={100}
                      step={1}
                      size="large"
                    />
                  </div>
                </div>
              </Card>
            ),
          },
          {
            key: 'template',
            label: '消息模板',
            children: (
              <Card size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span>消息模板列表</span>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingTemplate(null);
                      form.resetFields();
                      setTemplateModalVisible(true);
                    }}
                  >
                    添加模板
                  </Button>
                </div>
                
                <Table
                  dataSource={messageTemplates}
                  columns={[
                    {
                      title: '名称',
                      dataIndex: 'name',
                      key: 'name',
                    },
                    {
                      title: '级别',
                      dataIndex: 'level',
                      key: 'level',
                      render: (level: 'info' | 'warning' | 'error') => {
                        const levelMap: Record<string, string> = {
                          info: '信息',
                          warning: '警告',
                          error: '错误'
                        };
                        return (
                          <span style={{ 
                            color: level === 'error' ? '#ff4d4f' : level === 'warning' ? '#faad14' : '#52c41a',
                            fontWeight: 'bold'
                          }}>
                            {levelMap[level]}
                          </span>
                        );
                      }
                    },
                    {
                      title: '状态',
                      dataIndex: 'enabled',
                      key: 'enabled',
                      render: (enabled, record) => (
                        <Switch
                          checked={enabled}
                          onChange={(checked) => {
                            updateMessageTemplate({ ...record, enabled: checked });
                          }}
                        />
                      )
                    },
                    {
                      title: '操作',
                      key: 'action',
                      render: (_, record) => (
                        <Space size="middle">
                          <Button
                            type="link"
                            icon={<EditOutlined />}
                            onClick={() => {
                              setEditingTemplate(record);
                              form.setFieldsValue(record);
                              setTemplateModalVisible(true);
                            }}
                          >
                            编辑
                          </Button>
                          <Popconfirm
                            title="确定要删除这个模板吗？"
                            onConfirm={() => deleteMessageTemplate(record.id)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Button
                              type="link"
                              danger
                              icon={<DeleteOutlined />}
                            >
                              删除
                            </Button>
                          </Popconfirm>
                        </Space>
                      )
                    },
                  ]}
                  rowKey="id"
                  pagination={false}
                  style={{ marginBottom: '16px' }}
                  size="small"
                />
                
                <div style={{ padding: '12px', backgroundColor: '#f0f2f5', borderRadius: '4px' }}>
                  <h5 style={{ marginBottom: '8px', color: '#1890ff' }}>可用标签变量：</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['deviceName', 'deviceIp', 'deviceStatus', 'pingTime', 'timestamp'].map((tag) => (
                      <span key={tag} style={{ 
                        padding: '4px 8px', 
                        backgroundColor: '#fff', 
                        border: '1px solid #d9d9d9', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        color: '#595959'
                      }}>
                        {'{{'}{tag}{'}}'}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ),
          },
        ]}
      />
      
      {/* Message Template Modal */}
      <Modal
        title={editingTemplate ? '编辑消息模板' : '添加消息模板'}
        open={templateModalVisible}
        onCancel={() => setTemplateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (editingTemplate) {
              // Add id to values when editing
              updateMessageTemplate({ ...values, id: editingTemplate.id } as MessageTemplate);
            } else {
              addMessageTemplate(values as Omit<MessageTemplate, 'id'>);
            }
            setTemplateModalVisible(false);
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="模板名称"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="请输入模板名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="level"
                label="消息级别"
                rules={[{ required: true, message: '请选择消息级别' }]}
              >
                <Select placeholder="请选择消息级别">
                  <Option value="info">信息</Option>
                  <Option value="warning">警告</Option>
                  <Option value="error">错误</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="title"
            label="消息标题"
            rules={[{ required: true, message: '请输入消息标题' }]}
          >
            <Input placeholder="请输入消息标题" />
          </Form.Item>
          
          <Form.Item
            name="content"
            label="消息内容"
            rules={[{ required: true, message: '请输入消息内容' }]}
          >
            <Input.TextArea
              rows={6}
              placeholder="请输入消息内容，支持使用{{deviceName}}、{{deviceIp}}等标签变量"
            />
          </Form.Item>
          
          <Form.Item
            name="enabled"
            label="启用模板"
            valuePropName="checked"
          >
            <Switch defaultChecked />
          </Form.Item>
          
          <Form.Item style={{ textAlign: 'right' }}>
            <Space size="middle">
              <Button onClick={() => setTemplateModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingTemplate ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Modal>
  );
};

export default ConfigPanel;