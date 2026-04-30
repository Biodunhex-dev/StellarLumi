'use client';

import { useState, useCallback } from 'react';
import {
  isConnected,
  getPublicKey,
  signTransaction,
} from '@freighter-api/freighter-api';

export function useFreighter() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const connected = await isConnected();
      if (!connected) throw new Error('Freighter not installed');
      const key = await getPublicKey();
      setPublicKey(key);
      return key;
    } finally {
      setConnecting(false);
    }
  }, []);

  const sign = useCallback(
    async (xdr: string, networkPassphrase: string) => {
      if (!publicKey) throw new Error('Wallet not connected');
      return signTransaction(xdr, { networkPassphrase });
    },
    [publicKey],
  );

  return { publicKey, connecting, connect, sign };
}
