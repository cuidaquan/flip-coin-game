import React, { useEffect, useState } from 'react';
import { SuiClient } from '@mysten/sui.js/client';
import { Button } from 'antd';
import { useWalletKit } from '@mysten/wallet-kit';
import { formatCoinAmount } from '../utils/sui';
import { CONFIG } from '../config';

interface CoinBalanceProps {
  suiClient: SuiClient;
  onMint: () => void;
  refreshTrigger?: number;
}

const CoinBalance: React.FC<CoinBalanceProps> = ({ suiClient, onMint, refreshTrigger = 0 }) => {
  const { currentAccount } = useWalletKit();
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 576);

  const fetchBalance = async () => {
    if (!currentAccount) return;
    
    setLoading(true);
    try {
      const coins = await suiClient.getCoins({
        owner: currentAccount.address,
        coinType: `${CONFIG.FAUCET_COIN_PACKAGE_ID}::${CONFIG.FAUCET_COIN_MODULE_NAME}::FAUCET_COIN`,
      });
      
      // 计算总余额
      const totalBalance = coins.data.reduce((sum, coin) => sum + Number(coin.balance), 0);
      setBalance(formatCoinAmount(totalBalance));
    } catch (error) {
      console.error('获取余额失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    
    // 添加响应式检测
    const handleResize = () => {
      setIsMobile(window.innerWidth < 576);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentAccount]);

  // 监听refreshTrigger变化，当有余额变化时刷新
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchBalance();
    }
  }, [refreshTrigger]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: isMobile ? '5px' : '15px',
      flexDirection: isMobile ? 'column' : 'row',
      marginRight: isMobile ? '0' : '20px'
    }}>
      <span style={{ 
        color: 'white', 
        fontSize: isMobile ? '12px' : '16px',
        whiteSpace: 'nowrap',
        fontWeight: isMobile ? 'normal' : 'bold',
        textShadow: isMobile ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.3)'
      }}>
        余额: {balance} CDQ
      </span>
      <Button 
        type="primary" 
        onClick={onMint}
        loading={loading}
        size={isMobile ? 'small' : 'middle'}
        style={{
          height: isMobile ? '24px' : '38px',
          fontSize: isMobile ? '12px' : '14px',
          padding: isMobile ? '0 10px' : '4px 20px',
          borderRadius: '6px',
          background: isMobile ? undefined : 'linear-gradient(to right, #1890ff, #36cfc9)',
          border: isMobile ? undefined : 'none',
          boxShadow: isMobile ? undefined : '0 2px 6px rgba(24, 144, 255, 0.3)'
        }}
      >
        铸造
      </Button>
    </div>
  );
};

export default CoinBalance; 