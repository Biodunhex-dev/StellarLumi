import { Test } from '@nestjs/testing';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  campaign: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  contribution: { upsert: jest.fn() },
};

describe('CampaignsService', () => {
  let svc: CampaignsService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    svc = mod.get(CampaignsService);
    jest.clearAllMocks();
  });

  it('creates a campaign', async () => {
    mockPrisma.campaign.create.mockResolvedValue({ id: 'c1', milestones: [] });
    const result = await svc.create({
      creator: 'GABC',
      goal: 1000,
      token: 'USDC',
      deadline: new Date(Date.now() + 86400000).toISOString(),
      milestones: [{ description: 'Phase 1', targetAmount: 1000 }],
    });
    expect(result.id).toBe('c1');
    expect(mockPrisma.campaign.create).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundException for unknown campaign', async () => {
    mockPrisma.campaign.findUnique.mockResolvedValue(null);
    await expect(svc.findOne('unknown')).rejects.toThrow('Campaign not found');
  });
});
