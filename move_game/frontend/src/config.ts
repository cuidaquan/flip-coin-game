// 合约地址和配置信息
export const CONFIG = {
  // 游戏合约地址（需要替换为实际部署的地址）
  GAME_PACKAGE_ID: "0x4c194e5cfaf4a52ad9c92408ededad9ab0aaa2ee0391daa7aa1e8b9b3beef916",
  GAME_MODULE_NAME: "flip_coin",
  GAME_OBJECT_ID: "0xfa660dd94024e163a9d7615c4cf5b569cfc8ff4178176aa59c1e0e887fbbc647", // 需要替换为实际的Game对象ID
  
  // 管理员权限对象ID
  ADMIN_CAP_ID: "0x494fc91bf3ce383f3a2d87e482734ea3d8b6cdbf5e651270656c2fad2830a483", // 需要替换为实际的AdminCap对象ID
  
  // 代币合约地址
  FAUCET_COIN_PACKAGE_ID: "0x25fbc1ddd967fd9a06c9ac3c0ad5dfa480cc4f97060ee5da44f67eed52b178b1",
  FAUCET_COIN_MODULE_NAME: "faucet_coin",
  FAUCET_COIN_TREASURY_CAP_ID: "0xc64c286ab65f13766151f05a10e5a81125396dfa4bb3b1d41c36a9b2ab15b197", // 需要替换为实际的TreasuryCap对象ID
  
  // 随机数生成器地址
  RANDOM_ID: "0x0000000000000000000000000000000000000000000000000000000000000008",
  
  // 网络配置
  NETWORK: "testnet", // 可以是 'mainnet', 'testnet', 'devnet', 'localnet'
  
  // 游戏配置
  MIN_BET_AMOUNT: 1000000, // 最小下注金额（1 FAUCET_COIN，考虑到6位小数）
  MAX_BET_AMOUNT: 10000000, // 最大下注金额（10 FAUCET_COIN，考虑到6位小数）
}; 