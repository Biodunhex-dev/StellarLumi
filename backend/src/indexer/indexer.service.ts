import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { CampaignsService } from '../campaigns/campaigns.service';

const HORIZON_URL = process.env.HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
const CONTRACT_ID = process.env.CONTRACT_ID ?? '';

interface SorobanEvent {
  type: string;
  topic: string[];
  value: { xdr: string };
  transaction_hash: string;
}

@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);
  private cursor = 'now';

  constructor(private readonly campaigns: CampaignsService) {}

  onModuleInit() {
    if (!CONTRACT_ID) this.logger.warn('CONTRACT_ID not set — indexer disabled');
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async poll() {
    if (!CONTRACT_ID) return;
    try {
      const { data } = await axios.get(`${HORIZON_URL}/contracts/${CONTRACT_ID}/events`, {
        params: { cursor: this.cursor, limit: 50, order: 'asc' },
      });

      const records: SorobanEvent[] = data._embedded?.records ?? [];
      for (const ev of records) {
        await this.handleEvent(ev);
      }
      if (records.length > 0) {
        this.cursor = data._embedded.records.at(-1).paging_token;
      }
    } catch (err: any) {
      this.logger.error('Horizon poll failed', err.message);
    }
  }

  private async handleEvent(ev: SorobanEvent) {
    const topic = ev.topic?.[0] ?? '';
    this.logger.debug(`event: ${topic}`);

    // Decode XDR values — simplified: real impl uses stellar-sdk xdr helpers
    switch (topic) {
      case 'contrib': {
        // topic: [contrib, campaign_id, contributor, amount]
        const [, campaignId, contributor, amount] = ev.topic;
        await this.campaigns.upsertContribution(
          campaignId, contributor, BigInt(amount), ev.transaction_hash,
        ).catch(() => {/* campaign may not be in DB yet */});
        break;
      }
      case 'funded': {
        const [, campaignId, totalRaised] = ev.topic;
        await this.campaigns.updateFromChain(BigInt(campaignId), {
          status: 'successful',
          totalRaised: BigInt(totalRaised),
        }).catch(() => {});
        break;
      }
      case 'failed': {
        const [, campaignId] = ev.topic;
        await this.campaigns.updateFromChain(BigInt(campaignId), { status: 'failed' }).catch(() => {});
        break;
      }
      case 'released': {
        const [, campaignId, milestoneIndex] = ev.topic;
        await this.campaigns.updateFromChain(BigInt(campaignId), {
          currentMilestone: Number(milestoneIndex) + 1,
        }).catch(() => {});
        break;
      }
    }
  }
}
