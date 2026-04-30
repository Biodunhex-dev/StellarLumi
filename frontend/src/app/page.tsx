import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui';
import { fetchCampaigns } from '@/lib/api';
import { CampaignCard } from '@/components/campaign/CampaignCard';

export default async function HomePage() {
  const campaigns = await fetchCampaigns('active').catch(() => []);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <section className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-extrabold tracking-tight">
            Fund the future,{' '}
            <span className="text-brand">milestone by milestone</span>
          </h1>
          <p className="mb-8 text-lg text-gray-400">
            Transparent crowdfunding on Stellar. Funds release only when backers approve each milestone.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/campaigns/new">
              <Button>Start a Campaign</Button>
            </Link>
            <Link href="/campaigns">
              <Button variant="outline">Explore Campaigns</Button>
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-bold">Active Campaigns</h2>
          {campaigns.length === 0 ? (
            <p className="text-gray-500">No active campaigns yet.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c: any) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
