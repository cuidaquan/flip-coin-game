import React, { useEffect, useState } from 'react';
import { SuiClient } from '@mysten/sui.js/client';
import { Button, Card, Input, Modal, Typography, Radio } from 'antd';
import { useWalletKit } from '@mysten/wallet-kit';
import { formatCoinAmount, parseCoinAmount, createPlayTransaction, getGameObject } from '../utils/sui';
import { CONFIG } from '../config';

const { Title } = Typography;

interface FlipCoinGameProps {
  suiClient: SuiClient;
  onSuccess: () => void;
}

interface CoinObject {
  coinObjectId: string;
  balance: string;
}

const FlipCoinGame: React.FC<FlipCoinGameProps> = ({ suiClient, onSuccess }) => {
  const { signAndExecuteTransactionBlock, currentAccount } = useWalletKit();
  const [betAmount, setBetAmount] = useState<string>('1');
  const [choice, setChoice] = useState<boolean>(true); // true为正面，false为反面
  const [spinning, setSpinning] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const [isWin, setIsWin] = useState<boolean | null>(null);
  const [coinObjects, setCoinObjects] = useState<CoinObject[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [poolBalance, setPoolBalance] = useState<string>('0');
  const [poolBalanceRaw, setPoolBalanceRaw] = useState<number>(0);
  const [userBalance, setUserBalance] = useState<string>('0');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 576);

  const fetchCoinObjects = async () => {
    if (!currentAccount) return 0;
    
    setLoading(true);
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
      
      return totalBalance;
    } catch (error) {
      console.error('获取代币对象失败:', error);
      return 0;
    } finally {
      setLoading(false);
    }
  };

  const fetchPoolBalance = async () => {
    if (!CONFIG.GAME_OBJECT_ID) return;
    
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
    }
  };

  useEffect(() => {
    if (currentAccount) {
      fetchCoinObjects();
      fetchPoolBalance();
    }
    
    // 添加响应式检测
    const handleResize = () => {
      setIsMobile(window.innerWidth < 576);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentAccount, suiClient]);

  // 处理金额输入，只允许输入正整数
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 只允许输入正整数
    if (/^\d*$/.test(value)) {
      setBetAmount(value);
    }
  };

  const handlePlay = async () => {
    if (!betAmount || !currentAccount || coinObjects.length === 0) {
      Modal.error({
        title: '无法下注',
        content: '请确保您已连接钱包并拥有足够的代币',
      });
      return;
    }
    
    const amountToBet = parseCoinAmount(betAmount);
    const userTotalBalance = coinObjects.reduce((sum, coin) => sum + Number(coin.balance), 0);
    const maxBetAmount = Math.min(poolBalanceRaw / 10, userTotalBalance);
    
    // 检查下注金额是否在允许范围内
    if (amountToBet < CONFIG.MIN_BET_AMOUNT) {
      Modal.error({
        title: '下注金额过小',
        content: `最小下注金额为 ${formatCoinAmount(CONFIG.MIN_BET_AMOUNT)} CDQ`,
      });
      return;
    }
    
    if (amountToBet > maxBetAmount) {
      Modal.error({
        title: '下注金额过大',
        content: `最大下注金额为 ${formatCoinAmount(maxBetAmount)} CDQ`,
      });
      return;
    }
    
    // 检查游戏池余额是否足够
    if (poolBalanceRaw < amountToBet * 10) {
      Modal.error({
        title: '游戏池余额不足',
        content: `游戏池余额必须是下注金额的10倍以上。当前游戏池余额: ${poolBalance} CDQ，最大可下注: ${formatCoinAmount(poolBalanceRaw / 10)} CDQ`,
      });
      return;
    }
    
    // 找到合适的代币对象
    let coinToUse = null;
    for (const coin of coinObjects) {
      if (Number(coin.balance) >= amountToBet) {
        coinToUse = coin;
        break;
      }
    }
    
    if (!coinToUse) {
      Modal.error({
        title: '余额不足',
        content: '没有足够的代币进行下注',
      });
      return;
    }
    
    // 记录下注前的余额
    const balanceBefore = await fetchCoinObjects() || 0;
    console.log('下注前余额:', formatCoinAmount(balanceBefore));
    
    // 开始游戏动画
    setSpinning(true);
    setResult(null);
    setIsWin(null);
    
    try {
      const txb = createPlayTransaction(coinToUse.coinObjectId, amountToBet, choice);
      
      // 使用as any临时解决类型不兼容问题
      const result = await signAndExecuteTransactionBlock({
        transactionBlock: txb as any,
      });
      
      console.log('游戏交易结果:', result);
      
      // 等待一段时间，确保链上状态已更新
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟硬币翻转动画
      setTimeout(async () => {
        setSpinning(false);
        
        try {
          // 获取交易后的余额
          const balanceAfter = await fetchCoinObjects() || 0;
          console.log('下注后余额:', formatCoinAmount(balanceAfter));
          
          // 根据余额变化判断输赢
          const balanceDiff = balanceAfter - balanceBefore;
          console.log('余额变化:', formatCoinAmount(balanceDiff));
          
          // 生成随机结果用于显示
          const randomResult = Math.random() > 0.5;
          setResult(randomResult ? '正面' : '反面');
          
          // 判断游戏结果
          if (Math.abs(balanceDiff) < 100) {
            // 余额几乎没变，可能是交易失败
            console.log('余额几乎没变，可能是交易失败');
            Modal.error({
              title: '游戏失败',
              content: '交易可能未成功执行，请检查网络连接或稍后再试',
            });
          } else if (balanceDiff > 0) {
            // 余额增加，玩家赢了
            console.log('余额增加，玩家赢了');
            setIsWin(true);
            Modal.success({
              title: '恭喜！',
              content: `您赢了 ${formatCoinAmount(balanceDiff)} CDQ！`,
            });
          } else {
            // 余额减少，玩家输了
            console.log('余额减少，玩家输了');
            setIsWin(false);
            Modal.info({
              title: '很遗憾',
              content: `您输了 ${betAmount} CDQ。`,
            });
          }
          
          // 更新游戏池余额
          fetchPoolBalance();
          onSuccess();
        } catch (error) {
          console.error('获取游戏结果时出错:', error);
          Modal.error({
            title: '获取结果失败',
            content: '无法获取游戏结果，请刷新页面查看您的余额变化',
          });
        }
      }, 1000);
    } catch (error) {
      console.error('游戏失败:', error);
      setSpinning(false);
      
      // 提取更详细的错误信息
      let errorMsg = '交易执行过程中出现错误';
      if (error instanceof Error) {
        errorMsg += `: ${error.message}`;
      }
      
      Modal.error({
        title: '游戏失败',
        content: errorMsg,
      });
    }
  };

  return (
    <Card 
      title="猜硬币游戏" 
      style={{ 
        marginBottom: '20px',
        maxWidth: '100%',
        margin: '0 auto 20px auto',
        width: '100%',
        boxShadow: isMobile ? undefined : '0 4px 12px rgba(0, 0, 0, 0.12)'
      }}
      bodyStyle={{
        padding: isMobile ? '15px 10px' : '40px'
      }}
      headStyle={{
        fontSize: isMobile ? '16px' : '24px',
        fontWeight: 'bold',
        backgroundColor: isMobile ? undefined : '#f0f6ff',
        padding: isMobile ? undefined : '15px 24px'
      }}
    >
      <div className="coin-game-container" style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '30px', alignItems: 'center', justifyContent: 'center', marginBottom: '30px' }}>
          <div style={{ flex: isMobile ? 'unset' : '0 0 30%' }}>
            <div 
              className={`coin ${spinning ? 'spinning' : choice ? 'heads' : 'tails'}`} 
              style={{ 
                margin: '0 auto 20px',
                width: isMobile ? '80px' : '180px',
                height: isMobile ? '80px' : '180px',
                fontSize: isMobile ? '24px' : '55px',
                lineHeight: isMobile ? '80px' : '180px',
                borderRadius: '50%',
                background: spinning ? '#f0f0f0' : 'linear-gradient(145deg, #f9f9f9, #e6e6e6)',
                border: spinning ? '1px solid #d9d9d9' : '1px solid #ccc',
                boxShadow: spinning ? '0 2px 8px rgba(0, 0, 0, 0.15)' : '0 8px 16px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                color: spinning ? '#999' : '#1890ff'
              }}
            >
              {spinning ? '?' : choice ? '正' : '反'}
            </div>
            
            {result && (
              <div 
                className={`result ${isWin ? 'win' : 'lose'}`} 
                style={{ 
                  margin: '15px auto',
                  padding: isMobile ? '8px' : '16px',
                  borderRadius: isMobile ? '4px' : '8px',
                  background: isWin ? '#f6ffed' : '#fff1f0',
                  border: `1px solid ${isWin ? '#b7eb8f' : '#ffa39e'}`,
                  color: isWin ? '#52c41a' : '#f5222d',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '14px' : '18px',
                  maxWidth: isMobile ? 'auto' : '80%'
                }}
              >
                结果: {result} - {isWin ? '你赢了！' : '你输了！'}
              </div>
            )}
          </div>
          
          <div style={{ flex: isMobile ? 'unset' : '0 0 60%', marginTop: isMobile ? '20px' : '0' }}>
            <div style={{ 
              marginBottom: '25px',
              padding: isMobile ? '10px 0' : '0 0 20px 0',
              maxWidth: isMobile ? '400px' : '100%',
              margin: '0 auto'
            }}>
              <Title level={isMobile ? 5 : 4} style={{ 
                marginBottom: '20px',
                fontSize: isMobile ? '16px' : '22px',
                color: '#333'
              }}>
                选择硬币面:
              </Title>
              <Radio.Group 
                value={choice} 
                onChange={(e) => setChoice(e.target.value)}
                buttonStyle="solid"
                disabled={spinning}
                size={isMobile ? 'middle' : 'large'}
                style={{ display: 'flex', justifyContent: 'center', gap: '20px', maxWidth: isMobile ? '300px' : '400px', margin: '0 auto' }}
              >
                <Radio.Button 
                  value={true}
                  style={{ 
                    flex: 1, 
                    textAlign: 'center',
                    height: isMobile ? '36px' : '54px', 
                    lineHeight: isMobile ? '36px' : '54px',
                    fontSize: isMobile ? '14px' : '18px',
                    borderRadius: isMobile ? '4px' : '8px'
                  }}
                >
                  正面
                </Radio.Button>
                <Radio.Button 
                  value={false}
                  style={{ 
                    flex: 1, 
                    textAlign: 'center',
                    height: isMobile ? '36px' : '54px', 
                    lineHeight: isMobile ? '36px' : '54px',
                    fontSize: isMobile ? '14px' : '18px',
                    borderRadius: isMobile ? '4px' : '8px'
                  }}
                >
                  反面
                </Radio.Button>
              </Radio.Group>
            </div>
            
            <div style={{ 
              marginBottom: '25px',
              maxWidth: isMobile ? '400px' : '100%',
              margin: '0 auto'
            }}>
              <Title level={isMobile ? 5 : 4} style={{ 
                marginBottom: '20px',
                fontSize: isMobile ? '16px' : '22px',
                color: '#333'
              }}>
                下注金额:
              </Title>
              <Input
                placeholder="请输入下注金额"
                value={betAmount}
                onChange={handleAmountChange}
                suffix="CDQ"
                type="text"
                pattern="\d*"
                style={{ 
                  width: isMobile ? '80%' : '350px', 
                  margin: '0 auto',
                  fontSize: isMobile ? '14px' : '18px',
                  height: isMobile ? '40px' : '54px',
                  borderRadius: isMobile ? '4px' : '8px'
                }}
                size={isMobile ? 'middle' : 'large'}
                disabled={spinning}
              />
              <div style={{ 
                marginTop: '12px', 
                fontSize: isMobile ? '11px' : '14px', 
                color: '#666' 
              }}>
                最小: {formatCoinAmount(CONFIG.MIN_BET_AMOUNT)} CDQ, 
                最大: {formatCoinAmount(Math.min(
                  poolBalanceRaw / 10, 
                  coinObjects.reduce((sum, coin) => sum + Number(coin.balance), 0)
                ))} CDQ
              </div>
            </div>
            
            <Button 
              type="primary" 
              size={isMobile ? 'middle' : 'large'}
              onClick={handlePlay}
              loading={spinning || loading}
              disabled={!currentAccount || coinObjects.length === 0 || poolBalanceRaw < CONFIG.MIN_BET_AMOUNT * 10}
              style={{ 
                marginBottom: '25px',
                width: isMobile ? '80%' : '350px',
                height: isMobile ? '40px' : '60px',
                fontSize: isMobile ? '14px' : '20px',
                fontWeight: 'bold',
                borderRadius: isMobile ? '4px' : '8px',
                background: isMobile ? undefined : 'linear-gradient(to right, #1890ff, #36cfc9)'
              }}
            >
              开始游戏
            </Button>
          </div>
        </div>
        
        <div style={{ 
          padding: isMobile ? '8px' : '20px', 
          background: isMobile ? '#f5f5f5' : 'linear-gradient(to right, #e6f7ff, #f0f5ff)', 
          borderRadius: isMobile ? '8px' : '12px', 
          marginBottom: '20px',
          textAlign: 'left',
          maxWidth: isMobile ? '400px' : '600px',
          margin: '0 auto 25px',
          boxShadow: isMobile ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}>
          <Title level={5} style={{ 
            margin: '0 0 5px 0', 
            fontSize: isMobile ? '14px' : '18px',
            color: isMobile ? undefined : '#1890ff'
          }}>
            您的余额: {userBalance} CDQ
          </Title>
        </div>
        
        <div style={{ 
          marginTop: '20px', 
          fontSize: isMobile ? '12px' : '14px', 
          color: '#888', 
          textAlign: 'left',
          background: isMobile ? undefined : '#fafafa',
          padding: isMobile ? 0 : '20px',
          borderRadius: isMobile ? undefined : '12px',
          maxWidth: isMobile ? '500px' : '600px',
          margin: '0 auto',
          border: isMobile ? 'none' : '1px solid #f0f0f0'
        }}>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '12px',
            fontSize: isMobile ? '13px' : '16px',
            color: '#555'
          }}>
            游戏规则:
          </p>
          <ol style={{ 
            paddingLeft: isMobile ? '20px' : '30px', 
            margin: '0',
            lineHeight: '1.8'
          }}>
            <li>选择硬币的正面或反面</li>
            <li>输入下注金额</li>
            <li>如果猜对了，您将获得与下注金额相等的奖励</li>
            <li>如果猜错了，您将失去下注金额</li>
            <li>最大下注金额为游戏池余额的1/10或您的余额（取较小值）</li>
          </ol>
        </div>
      </div>
    </Card>
  );
};

export default FlipCoinGame; 