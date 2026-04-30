import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({ imports: [CampaignsModule], providers: [IndexerService] })
export class IndexerModule {}
