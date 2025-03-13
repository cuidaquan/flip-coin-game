import React from 'react';
import { ConnectButton, useWalletKit } from '@mysten/wallet-kit';
import { Button } from 'antd';

interface WalletConnectProps {
  className?: string;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ className }) => {
  const { isConnected, currentAccount } = useWalletKit();

  return (
    <div className={className}>
      {isConnected && currentAccount ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px' }}>
            {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
          </span>
          <ConnectButton />
        </div>
      ) : (
        <ConnectButton connectText="连接钱包" />
      )}
    </div>
  );
};

export default WalletConnect; 