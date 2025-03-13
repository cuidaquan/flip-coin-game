import React, { useEffect, useState } from 'react';
import { Layout, Typography, Modal, Input, Button } from 'antd';
import { useWalletKit } from '@mysten/wallet-kit';
import { getSuiClient, createMintTransaction, parseCoinAmount } from './utils/sui';
import { CONFIG } from './config';
import WalletConnect from './components/WalletConnect';
import CoinBalance from './components/CoinBalance';
import GamePool from './components/GamePool';
import FlipCoinGame from './components/FlipCoinGame';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const { signAndExecuteTransactionBlock, currentAccount } = useWalletKit();
  const [suiClient] = useState(getSuiClient());
  const [mintModalVisible, setMintModalVisible] = useState(false);
  const [mintAmount, setMintAmount] = useState('10');
  const [processing, setProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 576);

  // 检查配置是否完整
  useEffect(() => {
    if (!CONFIG.GAME_OBJECT_ID || !CONFIG.FAUCET_COIN_TREASURY_CAP_ID) {
      Modal.warning({
        title: '配置不完整',
        content: '请在config.ts文件中设置正确的游戏对象ID和代币TreasuryCap ID',
      });
    }
    
    // 添加响应式检测
    const handleResize = () => {
      setIsMobile(window.innerWidth < 576);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMint = () => {
    setMintModalVisible(true);
  };

  // 处理金额输入，只允许输入正整数
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 只允许输入正整数
    if (/^\d*$/.test(value)) {
      setMintAmount(value);
    }
  };

  const executeMint = async () => {
    if (!currentAccount || !mintAmount) return;
    
    setProcessing(true);
    try {
      const amountToMint = parseCoinAmount(mintAmount);
      const txb = createMintTransaction(amountToMint);
      
      // 使用as any临时解决类型不兼容问题
      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
      });
      
      console.log('铸造交易结果:', result);
      
      // 触发刷新
      setRefreshTrigger(prev => prev + 1);
      
      Modal.success({
        title: '铸造成功',
        content: `成功铸造 ${mintAmount} CDQ`,
      });
      
      setMintModalVisible(false);
      setMintAmount('10');
    } catch (error) {
      console.error('铸造失败:', error);
      Modal.error({
        title: '铸造失败',
        content: '无法完成代币铸造，请检查网络连接或稍后再试',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        padding: isMobile ? '0 10px' : '0 50px',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        height: isMobile ? '60px' : '70px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={isMobile ? 3 : 2} style={{ 
            margin: 0, 
            color: 'white', 
            fontSize: isMobile ? '20px' : '32px',
            marginRight: isMobile ? '10px' : '30px',
            fontWeight: 'bold'
          }}>
            猜硬币游戏
          </Title>
        </div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          justifyContent: isMobile ? 'flex-end' : 'flex-start'
        }}>
          <CoinBalance 
            suiClient={suiClient} 
            onMint={handleMint} 
            refreshTrigger={refreshTrigger}
          />
          <WalletConnect />
        </div>
      </Header>
      
      <Content style={{ 
        padding: isMobile ? '10px' : '40px 0',
        margin: isMobile ? '10px 5px' : '30px auto',
        maxWidth: isMobile ? '100%' : '1000px',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '15px' : '30px',
          justifyContent: 'center'
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            <GamePool 
              suiClient={suiClient} 
              onSuccess={handleRefresh} 
              key={`gamepool-${refreshTrigger}`} 
            />
          </div>
          <div style={{ 
            width: '100%', 
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            <FlipCoinGame 
              suiClient={suiClient} 
              onSuccess={handleRefresh}
              key={`flipcoin-${refreshTrigger}`} 
            />
          </div>
        </div>
      </Content>
      
      <Footer style={{ 
        textAlign: 'center',
        padding: isMobile ? '10px' : '24px',
        backgroundColor: '#f0f2f5'
      }}>
        猜硬币游戏 - Move智能合约演示项目 ©{new Date().getFullYear()}
      </Footer>
      
      <Modal
        title="铸造代币"
        open={mintModalVisible}
        onCancel={() => {
          setMintModalVisible(false);
          setMintAmount('10');
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setMintModalVisible(false);
              setMintAmount('10');
            }}
            size={isMobile ? 'middle' : 'large'}
          >
            取消
          </Button>,
          <Button 
            key="mint" 
            type="primary" 
            loading={processing} 
            onClick={executeMint}
            disabled={!mintAmount || !/^\d+$/.test(mintAmount) || Number(mintAmount) <= 0}
            size={isMobile ? 'middle' : 'large'}
          >
            铸造
          </Button>
        ]}
        width={isMobile ? '90%' : '520px'}
        bodyStyle={{ padding: isMobile ? '15px' : '24px' }}
      >
        <div style={{ marginBottom: '20px', fontSize: isMobile ? '14px' : '16px' }}>
          铸造测试代币用于游戏。
        </div>
        <Input
          placeholder="输入铸造金额"
          value={mintAmount}
          onChange={handleAmountChange}
          suffix="CDQ"
          size={isMobile ? 'middle' : 'large'}
          style={{ marginBottom: '10px' }}
        />
        <div style={{ 
          display: 'flex', 
          gap: '10px',
          flexWrap: 'wrap',
          marginTop: '10px' 
        }}>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setMintAmount('10')}>10</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setMintAmount('50')}>50</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setMintAmount('100')}>100</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setMintAmount('500')}>500</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setMintAmount('1000')}>1000</Button>
        </div>
      </Modal>
    </Layout>
  );
};

export default App; 