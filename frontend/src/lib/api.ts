const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface MilestoneInput { description: string; targetAmount: number }
export interface CreateCampaignInput {
  creator: string;
  goal: number;
  token: string;
  deadline: string;
  milestones: MilestoneInput[];
}

export async function fetchCampaigns(status?: string) {
  const url = status ? `${BASE}/campaigns?status=${status}` : `${BASE}/campaigns`;
  const res = await fetch(url, { next: { revalidate: 10 } });
  if (!res.ok) throw new Error('Failed to fetch campaigns');
  return res.json();
}

export async function fetchCampaign(id: string) {
  const res = await fetch(`${BASE}/campaigns/${id}`, { next: { revalidate: 5 } });
  if (!res.ok) throw new Error('Campaign not found');
  return res.json();
}

export async function createCampaignRecord(data: CreateCampaignInput) {
  const res = await fetch(`${BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create campaign');
  return res.json();
}
