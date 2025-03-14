# 猜硬币游戏前端

这是一个基于Sui区块链的猜硬币游戏前端应用。用户可以猜测硬币的正面或反面，并下注代币。如果猜对了，用户将获得与下注金额相等的奖励；如果猜错了，用户将失去下注金额。

## 功能特性

- 连接Sui钱包
- 铸造游戏代币
- 向游戏池充值
- 从游戏池提取（仅管理员）
- 猜硬币游戏（正面/反面）

## 技术栈

- React
- TypeScript
- Ant Design
- Sui SDK (@mysten/sui.js)
- Sui Wallet Kit (@mysten/wallet-kit)

## 开始使用

### 前提条件

- Node.js (v14+)
- npm 或 yarn
- Sui钱包（如Sui Wallet浏览器扩展）

### 安装

1. 克隆仓库
```
git clone <仓库地址>
cd move_game/frontend
```

2. 安装依赖
```
npm install
```
或
```
yarn install
```

3. 配置

在 `src/config.ts` 文件中，确保设置了正确的合约地址和对象ID：

```typescript
export const CONFIG = {
  // 游戏合约地址
  GAME_PACKAGE_ID: "0x4c194e5cfaf4a52ad9c92408ededad9ab0aaa2ee0391daa7aa1e8b9b3beef916",
  GAME_MODULE_NAME: "flip_coin",
  GAME_OBJECT_ID: "0xfa660dd94024e163a9d7615c4cf5b569cfc8ff4178176aa59c1e0e887fbbc647",
  
  // 代币合约地址
  FAUCET_COIN_PACKAGE_ID: "0x25fbc1ddd967fd9a06c9ac3c0ad5dfa480cc4f97060ee5da44f67eed52b178b1",
  FAUCET_COIN_MODULE_NAME: "faucet_coin",
  FAUCET_COIN_TREASURY_CAP_ID: "0xc64c286ab65f13766151f05a10e5a81125396dfa4bb3b1d41c36a9b2ab15b197",
  
  // 管理员权限对象ID
  ADMIN_CAP_ID: "0x您的管理员权限对象ID",
};
```

**重要提示：** 确保正确设置 `ADMIN_CAP_ID`，这是管理员权限对象的ID，拥有此对象的钱包地址将具有管理员权限，可以从游戏池中提取资金。

4. 启动开发服务器
```
npm start
```
或
```
yarn start
```

应用将在 http://localhost:3000 运行。

## 使用指南

1. 连接钱包：点击右上角的"连接钱包"按钮，选择您的Sui钱包。

2. 铸造代币：连接钱包后，点击"铸造代币"按钮，输入要铸造的代币数量，然后确认交易。

3. 游戏池操作：
   - 充值：点击"充值"按钮，输入要充值的金额，然后确认交易。
   - 提取（仅管理员）：如果您的钱包拥有管理员权限（拥有AdminCap对象），您将看到"管理员提取"按钮。点击此按钮，输入要提取的金额，然后确认交易。

4. 玩游戏：
   - 选择硬币的正面或反面。
   - 输入下注金额（在允许范围内）。
   - 点击"开始游戏"按钮，确认交易。
   - 等待结果，查看是否获胜。

## 管理员权限

管理员权限通过 `AdminCap` 对象控制，只有拥有此对象的钱包地址才能执行管理员操作，如从游戏池提取资金。

### 如何获取管理员权限

1. 管理员权限对象（AdminCap）在部署游戏合约时创建，并分配给部署合约的地址。
2. 管理员可以将此权限对象转移给其他地址。
3. 确保在 `config.ts` 文件中正确设置 `ADMIN_CAP_ID` 为您的管理员权限对象ID。

### 验证管理员权限

应用会自动检测您的钱包是否拥有管理员权限对象，如果有，将显示管理员专属功能。您可以在游戏池组件中看到"管理员提取"按钮。

## 注意事项

- 游戏池余额必须是下注金额的10倍以上。
- 只有管理员可以从游戏池提取代币。
- 确保您的钱包中有足够的SUI代币支付交易费用。
- 管理员权限对象（AdminCap）是关键安全资产，请妥善保管。

## 故障排除

如果您遇到以下问题：

1. **管理员权限不生效**：
   - 检查 `config.ts` 中的 `ADMIN_CAP_ID` 是否正确设置
   - 确认您的钱包地址确实拥有该AdminCap对象
   - 尝试刷新页面或重新连接钱包

2. **交易失败**：
   - 确保您的钱包中有足够的SUI代币支付交易费用
   - 检查网络连接是否稳定
   - 查看浏览器控制台中的错误信息以获取更多详情

## 开发者信息

如需了解更多信息或报告问题，请联系项目维护者。 