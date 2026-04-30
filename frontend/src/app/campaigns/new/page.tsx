'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Button, Card, Input } from '@/components/ui';
import { useFreighter } from '@/hooks/useFreighter';
import { buildTx, rpc, toScVal } from '@/lib/contract';
import { createCampaignRecord } from '@/lib/api';
import { Networks, nativeToScVal } from '@stellar/stellar-sdk';

const schema = z.object({
  goal: z.coerce.number().min(1),
  token: z.string().min(56).max(56),
  deadline: z.string().min(1),
  milestones: z.array(z.object({
    description: z.string().min(1),
    targetAmount: z.coerce.number().min(1),
  })).min(1),
});
type FormData = z.infer<typeof schema>;

const STEPS = ['Details', 'Milestones', 'Review'];

export default function NewCampaignPage() {
  const router = useRouter();
  const { publicKey, connect, sign } = useFreighter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { register, control, handleSubmit, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { milestones: [{ description: '', targetAmount: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'milestones' });

  async function onSubmit(data: FormData) {
    setSubmitting(true);
    setError('');
    try {
      const creator = publicKey ?? await connect();
      const deadline = Math.floor(new Date(data.deadline).getTime() / 1000);

      const milestonesScVal = nativeToScVal(
        data.milestones.map(m => ({
          description: m.description,
          target_amount: BigInt(m.targetAmount),
          votes_for: 0,
          votes_against: 0,
          released: false,
        })),
      );

      const tx = await buildTx(creator, 'create_campaign', [
        nativeToScVal(creator, { type: 'address' }),
        nativeToScVal(BigInt(data.goal), { type: 'i128' }),
        nativeToScVal(data.token, { type: 'address' }),
        nativeToScVal(BigInt(deadline), { type: 'u64' }),
        milestonesScVal,
      ]);

      const signed = await sign(tx.toXDR(), Networks.TESTNET);
      await rpc.sendTransaction(
        // @ts-ignore — stellar-sdk types
        { toXDR: () => signed },
      );

      // Persist off-chain record
      const record = await createCampaignRecord({
        creator,
        goal: data.goal,
        token: data.token,
        deadline: data.deadline,
        milestones: data.milestones,
      });

      router.push(`/campaigns/${record.id}`);
    } catch (e: any) {
      setError(e.message ?? 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-bold">Create Campaign</h1>

        {/* Step indicator */}
        <div className="mb-8 flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i <= step ? 'bg-brand text-white' : 'bg-gray-800 text-gray-500'
              }`}>{i + 1}</div>
              <span className={`text-sm ${i === step ? 'text-white' : 'text-gray-500'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="h-px w-8 bg-gray-700" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 0 && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Campaign Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Funding Goal (stroops)</label>
                  <Input type="number" {...register('goal')} placeholder="1000000000" />
                  {errors.goal && <p className="mt-1 text-xs text-red-400">{errors.goal.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Token Contract Address</label>
                  <Input {...register('token')} placeholder="CAAAAAAA..." />
                  {errors.token && <p className="mt-1 text-xs text-red-400">{errors.token.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-400">Deadline</label>
                  <Input type="datetime-local" {...register('deadline')} />
                  {errors.deadline && <p className="mt-1 text-xs text-red-400">{errors.deadline.message}</p>}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button type="button" onClick={() => setStep(1)}>Next →</Button>
              </div>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Milestones</h2>
              <div className="space-y-4">
                {fields.map((f, i) => (
                  <div key={f.id} className="rounded-lg border border-gray-700 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">Milestone {i + 1}</span>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(i)} className="text-xs text-red-400 hover:text-red-300">
                          Remove
                        </button>
                      )}
                    </div>
                    <Input
                      className="mb-2"
                      {...register(`milestones.${i}.description`)}
                      placeholder="Description"
                    />
                    <Input
                      type="number"
                      {...register(`milestones.${i}.targetAmount`)}
                      placeholder="Amount (stroops)"
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ description: '', targetAmount: 0 })}>
                  + Add Milestone
                </Button>
              </div>
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(0)}>← Back</Button>
                <Button type="button" onClick={() => setStep(2)}>Review →</Button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <h2 className="mb-4 text-lg font-semibold">Review & Launch</h2>
              {(() => {
                const v = getValues();
                return (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Goal</span><span>{v.goal.toLocaleString()} stroops</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Deadline</span><span>{new Date(v.deadline).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Milestones</span><span>{v.milestones.length}</span></div>
                    <div className="mt-4 space-y-2">
                      {v.milestones.map((m, i) => (
                        <div key={i} className="flex justify-between rounded bg-gray-800 px-3 py-2">
                          <span>{m.description}</span>
                          <span className="text-gray-400">{m.targetAmount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>← Back</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Launching…' : publicKey ? 'Launch Campaign' : 'Connect & Launch'}
                </Button>
              </div>
            </Card>
          )}
        </form>
      </main>
    </>
  );
}
