import React, { useState } from 'react';
import { Button, Card, Input, Typography } from 'antd';
import { SuiClient } from '@mysten/sui.js/client';
import { getGameObject } from '../utils/sui';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface TestPageProps {
  suiClient: SuiClient;
}

const TestPage: React.FC<TestPageProps> = ({ suiClient }) => {
  const [objectId, setObjectId] = useState<string>('0xfa660dd94024e163a9d7615c4cf5b569cfc8ff4178176aa59c1e0e887fbbc647');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleTest = async () => {
    if (!objectId) return;
    
    setLoading(true);
    try {
      const gameObject = await getGameObject(suiClient, objectId);
      setResult(JSON.stringify(gameObject, null, 2));
    } catch (error) {
      console.error('获取对象失败:', error);
      setResult(`错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="测试页面" style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Title level={5}>对象ID:</Title>
        <Input
          value={objectId}
          onChange={(e) => setObjectId(e.target.value)}
          placeholder="输入对象ID"
          style={{ marginBottom: '10px' }}
        />
        <Button type="primary" onClick={handleTest} loading={loading}>
          测试
        </Button>
      </div>
      
      <div>
        <Title level={5}>结果:</Title>
        <TextArea
          value={result}
          readOnly
          autoSize={{ minRows: 10, maxRows: 20 }}
        />
      </div>
    </Card>
  );
};

export default TestPage; 