'use client';

import { useFreighter } from '@/hooks/useFreighter';
import { Button } from './ui';

export function WalletButton() {
  const { publicKey, connecting, connect } = useFreighter();
  const short = publicKey ? `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}` : null;

  return (
    <Button onClick={connect} disabled={connecting} variant={publicKey ? 'outline' : 'primary'}>
      {connecting ? 'Connecting…' : short ?? 'Connect Freighter'}
    </Button>
  );
}
