import { notFound } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui';
import { MilestoneTracker } from '@/components/milestone/MilestoneTracker';
import { ContributeForm } from '@/components/campaign/ContributeForm';
import { fetchCampaign } from '@/lib/api';

export default async function CampaignPage({ params }: { params: { id: string } }) {
  const campaign = await fetchCampaign(params.id).catch(() => null);
  if (!campaign) notFound();

  const pct = Math.min(100, Math.round((Number(campaign.totalRaised) / Number(campaign.goal)) * 100));

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-2 flex items-center gap-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            campaign.status === 'active' ? 'bg-green-900 text-green-300' :
            campaign.status === 'successful' ? 'bg-blue-900 text-blue-300' :
            'bg-red-900 text-red-300'
          }`}>
            {campaign.status}
          </span>
          <span className="text-sm text-gray-500">
            by {campaign.creator.slice(0, 8)}…{campaign.creator.slice(-4)}
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Progress */}
            <Card>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold text-2xl">{pct}%</span>
                <span className="text-gray-400">
                  {Number(campaign.totalRaised).toLocaleString()} / {Number(campaign.goal).toLocaleString()} stroops
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-800">
                <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex justify-between text-xs text-gray-500">
                <span>{campaign.contributions?.length ?? 0} backers</span>
                <span>Deadline: {new Date(campaign.deadline).toLocaleDateString()}</span>
              </div>
            </Card>

            {/* Milestones */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Milestones</h2>
              <MilestoneTracker
                milestones={campaign.milestones}
                currentMilestone={campaign.currentMilestone}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {campaign.status === 'active' && (
              <Card>
                <h3 className="mb-4 font-semibold">Back this campaign</h3>
                <ContributeForm
                  campaignId={campaign.id}
                  contractId={BigInt(campaign.contractId ?? 0)}
                  token={campaign.token}
                />
              </Card>
            )}
            <Card>
              <h3 className="mb-3 font-semibold text-sm text-gray-400">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Token</span>
                  <span className="font-mono text-xs">{campaign.token.slice(0, 8)}…</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Milestone</span>
                  <span>{campaign.currentMilestone + 1} / {campaign.milestones.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
