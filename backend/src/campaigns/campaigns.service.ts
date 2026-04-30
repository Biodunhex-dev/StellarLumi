import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        contractId: 0n, // updated after on-chain tx
        creator: dto.creator,
        goal: BigInt(dto.goal),
        token: dto.token,
        deadline: new Date(dto.deadline),
        milestones: {
          create: dto.milestones.map((m, i) => ({
            index: i,
            description: m.description,
            targetAmount: BigInt(m.targetAmount),
          })),
        },
      },
      include: { milestones: true },
    });
  }

  async findAll(status?: string) {
    return this.prisma.campaign.findMany({
      where: status ? { status } : undefined,
      include: { milestones: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.campaign.findUnique({
      where: { id },
      include: { milestones: true, contributions: true },
    });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async updateFromChain(contractId: bigint, data: Partial<{
    totalRaised: bigint;
    status: string;
    currentMilestone: number;
  }>) {
    return this.prisma.campaign.update({
      where: { contractId },
      data,
    });
  }

  async upsertContribution(campaignId: string, contributor: string, amount: bigint, txHash: string) {
    return this.prisma.contribution.upsert({
      where: { campaignId_contributor: { campaignId, contributor } },
      create: { campaignId, contributor, amount, txHash },
      update: { amount: { increment: amount }, txHash },
    });
  }
}
