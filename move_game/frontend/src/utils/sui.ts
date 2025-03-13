import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { CONFIG } from '../config';

// 创建Sui客户端
export const getSuiClient = () => {
  const network = CONFIG.NETWORK;
  let rpcUrl = '';
  
  switch (network) {
    case 'mainnet':
      rpcUrl = 'https://fullnode.mainnet.sui.io:443';
      break;
    case 'testnet':
      rpcUrl = 'https://fullnode.testnet.sui.io:443';
      break;
    case 'devnet':
      rpcUrl = 'https://fullnode.devnet.sui.io:443';
      break;
    case 'localnet':
      rpcUrl = 'http://localhost:9000';
      break;
    default:
      rpcUrl = 'https://fullnode.testnet.sui.io:443';
  }
  
  return new SuiClient({ url: rpcUrl });
};

// 直接查询游戏对象
export const getGameObject = async (suiClient: SuiClient, objectId: string) => {
  try {
    const response = await suiClient.getObject({
      id: objectId,
      options: { 
        showContent: true,
        showDisplay: true,
        showOwner: true,
        showType: true,
        showStorageRebate: true,
      }
    });
    
    console.log('完整游戏对象数据:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error('获取游戏对象失败:', error);
    throw error;
  }
};

// 格式化代币金额（考虑小数位数）- 不显示小数位，直接舍去小数部分
export const formatCoinAmount = (amount: number | string): string => {
  const amountNum = typeof amount === 'string' ? parseInt(amount) : amount;
  return Math.floor(amountNum / 1000000).toString();
};

// 解析代币金额（转换为整数）
export const parseCoinAmount = (amount: number | string): number => {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
  return Math.floor(amountNum * 1000000);
};

// 创建猜硬币游戏交易
export const createPlayTransaction = (
  coinObjectId: string,
  betAmount: number,
  choice: boolean // true为正面，false为反面
): TransactionBlock => {
  const txb = new TransactionBlock();
  
  // 分割代币
  const [coin] = txb.splitCoins(txb.object(coinObjectId), [txb.pure(betAmount)]);
  
  // 调用游戏合约
  txb.moveCall({
    target: `${CONFIG.GAME_PACKAGE_ID}::${CONFIG.GAME_MODULE_NAME}::play`,
    arguments: [
      txb.object(CONFIG.GAME_OBJECT_ID), // game对象
      txb.object(CONFIG.RANDOM_ID), // 随机数生成器
      txb.pure(choice), // 选择（正面或反面）
      coin, // 下注金额
    ],
  });
  
  return txb;
};

// 创建铸造代币交易
export const createMintTransaction = (amount: number): TransactionBlock => {
  const txb = new TransactionBlock();
  
  txb.moveCall({
    target: `${CONFIG.FAUCET_COIN_PACKAGE_ID}::${CONFIG.FAUCET_COIN_MODULE_NAME}::mint`,
    arguments: [
      txb.object(CONFIG.FAUCET_COIN_TREASURY_CAP_ID), // TreasuryCap对象
      txb.pure(amount), // 铸造金额
    ],
  });
  
  return txb;
};

// 创建向游戏池充值交易
export const createDepositTransaction = (
  coinObjectId: string,
  amount: number
): TransactionBlock => {
  const txb = new TransactionBlock();
  
  // 分割代币
  const [coin] = txb.splitCoins(txb.object(coinObjectId), [txb.pure(amount)]);
  
  // 调用充值函数
  txb.moveCall({
    target: `${CONFIG.GAME_PACKAGE_ID}::${CONFIG.GAME_MODULE_NAME}::deposit`,
    arguments: [
      txb.object(CONFIG.GAME_OBJECT_ID), // game对象
      coin, // 充值金额
    ],
  });
  
  return txb;
};

// 创建从游戏池提取交易（仅管理员可调用）
export const createWithdrawTransaction = (amount: number): TransactionBlock => {
  const txb = new TransactionBlock();
  
  // 调用提取函数
  txb.moveCall({
    target: `${CONFIG.GAME_PACKAGE_ID}::${CONFIG.GAME_MODULE_NAME}::withdraw`,
    arguments: [
      txb.object(CONFIG.ADMIN_CAP_ID || '0x0'), // 管理员权限对象ID
      txb.object(CONFIG.GAME_OBJECT_ID), // game对象
      txb.pure(amount), // 提取金额
    ],
  });
  
  return txb;
}; 