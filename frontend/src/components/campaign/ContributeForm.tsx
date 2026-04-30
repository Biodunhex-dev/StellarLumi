'use client';

import { useState } from 'react';
import { useFreighter } from '@/hooks/useFreighter';
import { buildTx, rpc } from '@/lib/contract';
import { Button, Input } from '@/components/ui';
import { Networks, nativeToScVal } from '@stellar/stellar-sdk';

export function ContributeForm({
  campaignId,
  contractId,
  token,
}: {
  campaignId: string;
  contractId: bigint;
  token: string;
}) {
  const { publicKey, connect, sign } = useFreighter();
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleContribute() {
    setStatus('pending');
    setError('');
    try {
      const contributor = publicKey ?? await connect();
      const tx = await buildTx(contributor, 'contribute', [
        nativeToScVal(contractId, { type: 'u64' }),
        nativeToScVal(contributor, { type: 'address' }),
        nativeToScVal(BigInt(amount), { type: 'i128' }),
      ]);
      const signed = await sign(tx.toXDR(), Networks.TESTNET);
      // @ts-ignore
      await rpc.sendTransaction({ toXDR: () => signed });
      setStatus('success');
      setAmount('');
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm text-gray-400">Amount (stroops)</label>
      <Input
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="100000000"
        disabled={status === 'pending'}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {status === 'success' && (
        <p className="text-xs text-green-400">Contribution submitted!</p>
      )}
      <Button
        onClick={handleContribute}
        disabled={!amount || status === 'pending'}
        className="w-full"
      >
        {status === 'pending' ? 'Processing…' : publicKey ? 'Contribute' : 'Connect & Contribute'}
      </Button>
    </div>
  );
}
