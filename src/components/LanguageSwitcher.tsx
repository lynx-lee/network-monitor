import React from 'react';
import { Select } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import i18n from '../i18n/config';
import useConfigStore from '../store/configStore';

const { Option } = Select;

const LanguageSwitcher: React.FC = () => {
  const { language, updateLanguage } = useConfigStore();

  const handleLanguageChange = (value: string) => {
    i18n.changeLanguage(value);
    updateLanguage(value);
  };

  // Sync i18n language with config store on initial load
  React.useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  return (
    <Select
      value={language}
      onChange={handleLanguageChange}
      style={{ width: 120, marginRight: 16 }}
      prefix={<GlobalOutlined />}
      size="large"
    >
      <Option value="en">English</Option>
      <Option value="zh">中文</Option>
    </Select>
  );
};

export default LanguageSwitcher;