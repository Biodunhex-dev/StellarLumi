'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button, Card } from '@/components/ui';
import { useFreighter } from '@/hooks/useFreighter';
import { buildTx, rpc } from '@/lib/contract';
import { fetchCampaigns } from '@/lib/api';
import { Networks, nativeToScVal } from '@stellar/stellar-sdk';

interface Campaign {
  id: string;
  contractId: string;
  status: string;
  goal: string;
  totalRaised: string;
  deadline: string;
  contributions: { contributor: string; amount: string }[];
  milestones: { description: string }[];
}

export default function BackerPortal() {
  const { publicKey, connect } = useFreighter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [refunding, setRefunding] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    setLoading(true);
    fetchCampaigns()
      .then((all: Campaign[]) =>
        setCampaigns(
          all.filter(c =>
            c.contributions?.some(ct => ct.contributor === publicKey),
          ),
        ),
      )
      .finally(() => setLoading(false));
  }, [publicKey]);

  async function handleRefund(campaign: Campaign) {
    if (!publicKey) return;
    setRefunding(campaign.id);
    try {
      const tx = await buildTx(publicKey, 'refund', [
        nativeToScVal(BigInt(campaign.contractId), { type: 'u64' }),
        nativeToScVal(publicKey, { type: 'address' }),
      ]);
      const { sign } = useFreighter(); // eslint-disable-line react-hooks/rules-of-hooks
      const signed = await sign(tx.toXDR(), Networks.TESTNET);
      // @ts-ignore
      await rpc.sendTransaction({ toXDR: () => signed });
      setCampaigns(prev => prev.filter(c => c.id !== campaign.id));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRefunding(null);
    }
  }

  const myAmount = (c: Campaign) =>
    c.contributions?.find(ct => ct.contributor === publicKey)?.amount ?? '0';

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-bold">My Contributions</h1>

        {!publicKey ? (
          <Card className="text-center">
            <p className="mb-4 text-gray-400">Connect your wallet to view contributions.</p>
            <Button onClick={connect}>Connect Freighter</Button>
          </Card>
        ) : loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-gray-500">No contributions yet.</p>
        ) : (
          <div className="space-y-4">
            {campaigns.map(c => {
              const pct = Math.min(100, Math.round((Number(c.totalRaised) / Number(c.goal)) * 100));
              const canRefund =
                c.status === 'failed' ||
                (new Date(c.deadline) < new Date() && Number(c.totalRaised) < Number(c.goal));

              return (
                <Card key={c.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-400">
                        {c.milestones[0]?.description ?? 'Campaign'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Your contribution: {Number(myAmount(c)).toLocaleString()} stroops
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      c.status === 'active' ? 'bg-green-900 text-green-300' :
                      c.status === 'successful' ? 'bg-blue-900 text-blue-300' :
                      'bg-red-900 text-red-300'
                    }`}>{c.status}</span>
                  </div>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-gray-800">
                    <div className="h-1.5 rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">{pct}% funded</span>
                    {canRefund && (
                      <Button
                        variant="outline"
                        onClick={() => handleRefund(c)}
                        disabled={refunding === c.id}
                        className="text-xs"
                      >
                        {refunding === c.id ? 'Processing…' : 'Request Refund'}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
