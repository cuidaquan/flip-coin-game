import React, { useEffect, useState } from 'react';
import { SuiClient } from '@mysten/sui.js/client';
import { Button, Card, Input, Modal, Spin, Typography } from 'antd';
import { formatCoinAmount, parseCoinAmount, createDepositTransaction, createWithdrawTransaction, getGameObject } from '../utils/sui';
import { CONFIG } from '../config';
import { useWalletKit } from '@mysten/wallet-kit';

const { Text, Title } = Typography;

interface GamePoolProps {
  suiClient: SuiClient;
  onSuccess: () => void;
}

interface CoinObject {
  coinObjectId: string;
  balance: string;
}

const GamePool: React.FC<GamePoolProps> = ({ suiClient, onSuccess }) => {
  const { signAndExecuteTransactionBlock, currentAccount } = useWalletKit();
  const [poolBalance, setPoolBalance] = useState<string>('0');
  const [poolBalanceRaw, setPoolBalanceRaw] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [depositModalVisible, setDepositModalVisible] = useState<boolean>(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [coinObjects, setCoinObjects] = useState<CoinObject[]>([]);
  const [userBalance, setUserBalance] = useState<string>('0');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 576);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const fetchPoolBalance = async () => {
    if (!CONFIG.GAME_OBJECT_ID) return;
    
    setLoading(true);
    try {
      // 使用新的函数获取游戏对象
      const gameObject = await getGameObject(suiClient, CONFIG.GAME_OBJECT_ID);
      
      // 根据实际返回的数据结构调整访问路径
      const data = gameObject.data;
      if (data && data.content) {
        // 尝试从返回的数据中提取余额
        try {
          // 这里需要根据实际返回的数据结构进行调整
          const content = data.content as any;
          
          console.log('游戏对象完整数据:', JSON.stringify(data, null, 2));
          
          // 尝试不同的路径获取余额
          if (content.dataType === 'moveObject') {
            const fields = content.fields as any;
            console.log('游戏对象fields数据:', JSON.stringify(fields, null, 2));
            
            let balanceValue = 0;
            
            if (fields.balance && typeof fields.balance === 'string') {
              balanceValue = parseInt(fields.balance);
              console.log('找到balance字段:', balanceValue);
            } else if (fields.pool && fields.pool.fields && fields.pool.fields.balance) {
              balanceValue = parseInt(fields.pool.fields.balance);
              console.log('找到pool.fields.balance字段:', balanceValue);
            } else if (fields.pool && typeof fields.pool === 'string') {
              balanceValue = parseInt(fields.pool);
              console.log('找到pool字段:', balanceValue);
            } else if (fields.coin && fields.coin.fields && fields.coin.fields.balance) {
              balanceValue = parseInt(fields.coin.fields.balance);
              console.log('找到coin.fields.balance字段:', balanceValue);
            } else if (fields.amt && fields.amt.fields && fields.amt.fields.value) {
              balanceValue = parseInt(fields.amt.fields.value);
              console.log('找到amt.fields.value字段:', balanceValue);
            } else if (fields.amt && typeof fields.amt === 'string') {
              balanceValue = parseInt(fields.amt);
              console.log('找到amt字段:', balanceValue);
            } else {
              // 遍历fields寻找可能的余额字段
              for (const key in fields) {
                console.log(`检查字段 ${key}:`, JSON.stringify(fields[key], null, 2));
                
                // 尝试查找可能包含余额的字段
                if (typeof fields[key] === 'object' && fields[key] !== null) {
                  if (fields[key].type && fields[key].type.includes('Coin')) {
                    console.log('找到可能的代币字段:', key, fields[key]);
                    if (fields[key].fields && fields[key].fields.balance) {
                      balanceValue = parseInt(fields[key].fields.balance);
                      console.log('找到代币余额:', balanceValue);
                      break;
                    }
                  }
                }
              }
            }
            
            if (balanceValue > 0) {
              setPoolBalanceRaw(balanceValue);
              setPoolBalance(formatCoinAmount(balanceValue));
              console.log('设置游戏池余额:', formatCoinAmount(balanceValue));
            } else {
              console.warn('未找到有效的余额字段');
            }
          }
        } catch (e) {
          console.error('解析游戏池余额数据失败:', e);
        }
      }
    } catch (error) {
      console.error('获取游戏池余额失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoinObjects = async () => {
    if (!currentAccount) return;
    
    try {
      const coins = await suiClient.getCoins({
        owner: currentAccount.address,
        coinType: `${CONFIG.FAUCET_COIN_PACKAGE_ID}::${CONFIG.FAUCET_COIN_MODULE_NAME}::FAUCET_COIN`,
      });
      
      // 将API返回的数据转换为我们需要的格式
      const formattedCoins: CoinObject[] = coins.data.map(coin => ({
        coinObjectId: coin.coinObjectId,
        balance: coin.balance
      }));
      
      setCoinObjects(formattedCoins);
      
      // 计算总余额
      const totalBalance = formattedCoins.reduce((sum, coin) => sum + Number(coin.balance), 0);
      setUserBalance(formatCoinAmount(totalBalance));
    } catch (error) {
      console.error('获取代币对象失败:', error);
    }
  };

  useEffect(() => {
    fetchPoolBalance();
    if (currentAccount) {
      fetchCoinObjects();
      checkAdminCapPermission();
    }
    
    // 添加响应式检测
    const handleResize = () => {
      setIsMobile(window.innerWidth < 576);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentAccount, suiClient]);

  // 检查用户是否拥有AdminCap权限
  const checkAdminCapPermission = async () => {
    if (!currentAccount || !CONFIG.ADMIN_CAP_ID || CONFIG.ADMIN_CAP_ID === '0x0') return;
    
    try {
      // 首先尝试直接获取AdminCap对象
      try {
        const adminCapObject = await suiClient.getObject({
          id: CONFIG.ADMIN_CAP_ID,
          options: {
            showOwner: true,
          },
        });
        
        // 检查对象是否存在且归当前用户所有
        if (adminCapObject.data && 
            adminCapObject.data.owner && 
            typeof adminCapObject.data.owner === 'object' && 
            'AddressOwner' in adminCapObject.data.owner) {
          const ownerAddress = adminCapObject.data.owner.AddressOwner;
          const isOwner = ownerAddress === currentAccount.address;
          console.log('用户是否拥有管理员权限:', isOwner);
          setIsAdmin(isOwner);
          return;
        }
      } catch (e) {
        console.log('获取AdminCap对象失败，尝试其他方法:', e);
      }
      
      // 如果直接获取失败，尝试获取用户拥有的所有对象
      const objects = await suiClient.getOwnedObjects({
        owner: currentAccount.address,
        options: {
          showType: true,
          showContent: true,
        },
      });
      
      // 检查用户是否拥有AdminCap类型的对象
      const hasAdminCap = objects.data.some(obj => {
        if (!obj.data || !obj.data.content) return false;
        
        // 检查对象ID是否匹配
        if (obj.data.objectId === CONFIG.ADMIN_CAP_ID) {
          return true;
        }
        
        // 检查对象类型是否包含AdminCap
        const type = obj.data.type;
        if (type && type.includes('AdminCap')) {
          return true;
        }
        
        return false;
      });
      
      console.log('通过遍历对象检查用户是否拥有管理员权限:', hasAdminCap);
      setIsAdmin(hasAdminCap);
    } catch (error) {
      console.error('检查管理员权限失败:', error);
      setIsAdmin(false);
    }
  };

  // 处理金额输入，只允许输入正整数
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 只允许输入正整数
    if (/^\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleDeposit = async () => {
    if (!amount || !currentAccount || coinObjects.length === 0) return;
    
    setProcessing(true);
    try {
      const amountToDeposit = parseCoinAmount(amount);
      
      // 找到合适的代币对象
      let coinToUse = null;
      for (const coin of coinObjects) {
        if (Number(coin.balance) >= amountToDeposit) {
          coinToUse = coin;
          break;
        }
      }
      
      if (!coinToUse) {
        Modal.error({
          title: '余额不足',
          content: '没有足够的代币进行充值',
        });
        return;
      }
      
      const txb = createDepositTransaction(coinToUse.coinObjectId, amountToDeposit);
      
      // 使用as any临时解决类型不兼容问题
      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
      });
      
      console.log('充值交易结果:', result);
      
      // 检查交易是否成功
      // 首先检查effects.status.status，如果不存在则检查digest是否存在
      const isSuccess = 
        (result.effects?.status?.status === 'success') || 
        (result.digest !== undefined && result.digest !== null);
      
      if (isSuccess) {
        Modal.success({
          title: '充值成功',
          content: `成功向游戏池充值 ${amount} CDQ`,
        });
        
        setDepositModalVisible(false);
        setAmount('');
        
        // 等待一段时间，确保链上状态已更新
        setTimeout(() => {
          fetchPoolBalance();
          fetchCoinObjects();
          onSuccess();
        }, 1000);
      } else {
        // 获取错误信息
        let errorMsg = '交易执行失败';
        if (result.effects?.status?.error) {
          errorMsg += `，错误: ${result.effects.status.error}`;
        }
        
        Modal.error({
          title: '充值失败',
          content: errorMsg,
        });
      }
    } catch (error) {
      console.error('充值失败:', error);
      
      // 提取更详细的错误信息
      let errorMsg = '交易执行过程中出现错误';
      if (error instanceof Error) {
        errorMsg += `: ${error.message}`;
      }
      
      Modal.error({
        title: '充值失败',
        content: errorMsg,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || !currentAccount) return;
    
    // 检查ADMIN_CAP_ID是否已正确设置
    if (!CONFIG.ADMIN_CAP_ID || CONFIG.ADMIN_CAP_ID === '0x0') {
      Modal.error({
        title: '配置错误',
        content: '管理员权限对象ID (ADMIN_CAP_ID) 未正确设置，请在config.ts文件中设置正确的ID',
      });
      return;
    }
    
    // 再次检查用户是否有管理员权限
    if (!isAdmin) {
      Modal.error({
        title: '权限不足',
        content: '只有管理员才能从游戏池提取资金',
      });
      return;
    }
    
    setProcessing(true);
    try {
      const amountToWithdraw = parseCoinAmount(amount);
      
      // 检查提取金额是否超过池余额
      if (amountToWithdraw > poolBalanceRaw) {
        Modal.error({
          title: '余额不足',
          content: '提取金额超过游戏池余额',
        });
        setProcessing(false);
        return;
      }
      
      const txb = createWithdrawTransaction(amountToWithdraw);
      
      // 使用as any临时解决类型不兼容问题
      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
      });
      
      console.log('提取交易结果:', result);
      
      // 检查交易是否成功
      // 首先检查effects.status.status，如果不存在则检查digest是否存在
      const isSuccess = 
        (result.effects?.status?.status === 'success') || 
        (result.digest !== undefined && result.digest !== null);
      
      if (isSuccess) {
        Modal.success({
          title: '提取成功',
          content: `成功从游戏池提取 ${amount} CDQ`,
        });
        
        setWithdrawModalVisible(false);
        setAmount('');
        
        // 等待一段时间，确保链上状态已更新
        setTimeout(() => {
          fetchPoolBalance();
          fetchCoinObjects();
          onSuccess();
        }, 1000);
      } else {
        // 获取错误信息
        let errorMsg = '交易执行失败';
        if (result.effects?.status?.error) {
          errorMsg += `，错误: ${result.effects.status.error}`;
        }
        
        Modal.error({
          title: '提取失败',
          content: errorMsg,
        });
      }
    } catch (error) {
      console.error('提取失败:', error);
      
      // 提取更详细的错误信息
      let errorMsg = '交易执行过程中出现错误，可能是因为您不是管理员或余额不足';
      if (error instanceof Error) {
        errorMsg += `: ${error.message}`;
      }
      
      Modal.error({
        title: '提取失败',
        content: errorMsg,
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card 
      title="游戏池" 
      style={{ 
        maxWidth: '100%',
        width: '100%',
        margin: '0 auto',
        marginBottom: '20px',
        boxShadow: isMobile ? undefined : '0 4px 12px rgba(0, 0, 0, 0.12)'
      }}
      bodyStyle={{ 
        padding: isMobile ? '12px' : '35px' 
      }}
      headStyle={{
        fontSize: isMobile ? '16px' : '24px',
        fontWeight: 'bold',
        backgroundColor: isMobile ? undefined : '#f0f6ff',
        padding: isMobile ? undefined : '15px 24px'
      }}
    >
      <div style={{ marginBottom: '25px' }}>
        <div
          style={{
            padding: isMobile ? '10px' : '35px',
            borderRadius: '12px',
            background: isMobile ? '#f5f5f5' : 'linear-gradient(to right, #e6f7ff, #f0f5ff)',
            textAlign: 'center',
            marginBottom: '30px',
            boxShadow: isMobile ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}
        >
          <Title 
            level={isMobile ? 5 : 2} 
            style={{ 
              margin: 0, 
              fontSize: isMobile ? '16px' : '32px',
              color: isMobile ? undefined : '#1890ff'
            }}
          >
            当前游戏池余额: {poolBalance} CDQ
          </Title>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: isMobile ? '15px' : '40px', 
          justifyContent: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          maxWidth: '80%',
          margin: '0 auto'
        }}>
          <Button
            type="primary"
            onClick={() => setDepositModalVisible(true)}
            loading={loading}
            disabled={!currentAccount || coinObjects.length === 0}
            size="large"
            style={{ 
              flex: isMobile ? 'unset' : 1,
              height: isMobile ? '40px' : '60px',
              fontSize: isMobile ? '14px' : '20px',
              borderRadius: isMobile ? '4px' : '8px',
              background: isMobile ? undefined : 'linear-gradient(to right, #1890ff, #52c41a)',
              boxShadow: isMobile ? undefined : '0 4px 10px rgba(24, 144, 255, 0.3)'
            }}
          >
            充值
          </Button>
          
          {isAdmin && (
            <Button
              danger
              onClick={() => setWithdrawModalVisible(true)}
              loading={loading}
              disabled={!currentAccount || poolBalanceRaw === 0}
              size="large"
              style={{ 
                flex: isMobile ? 'unset' : 1,
                height: isMobile ? '40px' : '60px',
                fontSize: isMobile ? '14px' : '20px',
                borderRadius: isMobile ? '4px' : '8px',
                boxShadow: isMobile ? undefined : '0 4px 10px rgba(255, 77, 79, 0.2)'
              }}
              icon={<span style={{ marginRight: '5px' }}>👑</span>}
            >
              管理员提取
            </Button>
          )}
        </div>
      </div>

      <Modal
        title="充值到游戏池"
        open={depositModalVisible}
        onCancel={() => {
          setDepositModalVisible(false);
          setAmount('');
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setDepositModalVisible(false);
              setAmount('');
            }}
            size={isMobile ? 'middle' : 'large'}
          >
            取消
          </Button>,
          <Button 
            key="deposit" 
            type="primary" 
            loading={processing} 
            onClick={handleDeposit}
            disabled={!amount || !/^\d+$/.test(amount) || Number(amount) <= 0}
            size={isMobile ? 'middle' : 'large'}
          >
            充值
          </Button>
        ]}
        width={isMobile ? '90%' : '550px'}
        bodyStyle={{ padding: isMobile ? '15px' : '30px' }}
      >
        <div style={{ marginBottom: '20px', fontSize: isMobile ? '14px' : '16px' }}>
          <Text>您的余额: {userBalance} CDQ</Text>
        </div>
        <Input
          placeholder="输入充值金额"
          value={amount}
          onChange={handleAmountChange}
          suffix="CDQ"
          size={isMobile ? 'middle' : 'large'}
          style={{ marginBottom: '15px' }}
        />
        <div style={{ 
          display: 'flex', 
          gap: isMobile ? '10px' : '15px',
          flexWrap: 'wrap',
          marginTop: '15px' 
        }}>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setAmount('10')}>10</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setAmount('50')}>50</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setAmount('100')}>100</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setAmount('500')}>500</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setAmount('1000')}>1000</Button>
        </div>
      </Modal>

      <Modal
        title="从游戏池提取"
        open={withdrawModalVisible}
        onCancel={() => {
          setWithdrawModalVisible(false);
          setAmount('');
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setWithdrawModalVisible(false);
              setAmount('');
            }}
            size={isMobile ? 'middle' : 'large'}
          >
            取消
          </Button>,
          <Button 
            key="withdraw" 
            type="primary" 
            danger 
            loading={processing} 
            onClick={handleWithdraw}
            disabled={!amount || !/^\d+$/.test(amount) || Number(amount) <= 0 || Number(amount) > poolBalanceRaw}
            size={isMobile ? 'middle' : 'large'}
          >
            提取
          </Button>
        ]}
        width={isMobile ? '90%' : '550px'}
        bodyStyle={{ padding: isMobile ? '15px' : '30px' }}
      >
        <div style={{ marginBottom: '20px', fontSize: isMobile ? '14px' : '16px' }}>
          <Text>当前游戏池余额: {poolBalance} CDQ</Text>
        </div>
        <Input
          placeholder="输入提取金额"
          value={amount}
          onChange={handleAmountChange}
          suffix="CDQ"
          size={isMobile ? 'middle' : 'large'}
          style={{ marginBottom: '15px' }}
        />
        <div style={{ 
          display: 'flex', 
          gap: isMobile ? '10px' : '15px',
          flexWrap: 'wrap',
          marginTop: '15px' 
        }}>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setAmount('10')}>10</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setAmount('50')}>50</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setAmount('100')}>100</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setAmount('500')}>500</Button>
          <Button size={isMobile ? 'small' : 'middle'} onClick={() => setAmount(formatCoinAmount(poolBalanceRaw))}>全部</Button>
        </div>
      </Modal>
    </Card>
  );
};

export default GamePool; 