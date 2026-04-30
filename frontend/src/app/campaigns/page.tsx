import { Navbar } from '@/components/Navbar';
import { CampaignCard } from '@/components/campaign/CampaignCard';
import { fetchCampaigns } from '@/lib/api';

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const campaigns = await fetchCampaigns(searchParams.status).catch(() => []);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <div className="flex gap-2 text-sm">
            {['', 'active', 'successful', 'failed'].map(s => (
              <a
                key={s}
                href={s ? `?status=${s}` : '/campaigns'}
                className={`rounded-full px-3 py-1 ${
                  (searchParams.status ?? '') === s
                    ? 'bg-brand text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {s || 'All'}
              </a>
            ))}
          </div>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-gray-500">No campaigns found.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c: any) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
