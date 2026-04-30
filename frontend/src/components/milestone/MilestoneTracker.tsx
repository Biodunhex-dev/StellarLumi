'use client';

import { CheckCircle, Circle, Clock } from 'lucide-react';

interface Milestone {
  index: number;
  description: string;
  targetAmount: string;
  votesFor: number;
  votesAgainst: number;
  released: boolean;
}

export function MilestoneTracker({
  milestones,
  currentMilestone,
}: {
  milestones: Milestone[];
  currentMilestone: number;
}) {
  return (
    <div className="space-y-3">
      {milestones.map((m, i) => {
        const isReleased = m.released;
        const isCurrent = i === currentMilestone && !isReleased;
        const isPending = i > currentMilestone;
        const total = m.votesFor + m.votesAgainst;
        const approvalPct = total > 0 ? Math.round((m.votesFor / total) * 100) : 0;

        return (
          <div
            key={m.index}
            className={`rounded-lg border p-4 ${
              isReleased ? 'border-green-800 bg-green-950/30' :
              isCurrent ? 'border-brand/50 bg-brand/5' :
              'border-gray-800 bg-gray-900/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {isReleased ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : isCurrent ? (
                  <Clock className="h-5 w-5 text-brand" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{m.description}</span>
                  <span className="text-xs text-gray-400">
                    {Number(m.targetAmount).toLocaleString()} stroops
                  </span>
                </div>
                {!isPending && (
                  <div className="mt-2">
                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                      <span>Approval: {approvalPct}%</span>
                      <span>{m.votesFor} for / {m.votesAgainst} against</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-gray-800">
                      <div
                        className="h-1 rounded-full bg-green-500"
                        style={{ width: `${approvalPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
