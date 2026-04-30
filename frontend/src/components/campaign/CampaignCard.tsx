import Link from 'next/link';
import { Card } from '@/components/ui';

interface Campaign {
  id: string;
  creator: string;
  goal: string;
  totalRaised: string;
  status: string;
  deadline: string;
  milestones: { description: string }[];
}

export function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  const pct = Math.min(100, Math.round((Number(c.totalRaised) / Number(c.goal)) * 100));

  return (
    <Link href={`/campaigns/${c.id}`}>
      <Card className="hover:border-brand/50 transition-colors cursor-pointer h-full">
        <div className="mb-3 flex items-center justify-between">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            c.status === 'active' ? 'bg-green-900 text-green-300' :
            c.status === 'successful' ? 'bg-blue-900 text-blue-300' :
            'bg-red-900 text-red-300'
          }`}>
            {c.status}
          </span>
          <span className="text-xs text-gray-500">
            {c.milestones.length} milestone{c.milestones.length !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="mb-1 text-xs text-gray-500 truncate">
          {c.creator.slice(0, 8)}…{c.creator.slice(-4)}
        </p>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-gray-400">
            <span>{pct}% funded</span>
            <span>{Number(c.totalRaised).toLocaleString()} / {Number(c.goal).toLocaleString()} XLM</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-800">
            <div className="h-1.5 rounded-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Deadline: {new Date(c.deadline).toLocaleDateString()}
        </p>
      </Card>
    </Link>
  );
}
