import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { IndexerModule } from './indexer/indexer.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    CampaignsModule,
    IndexerModule,
  ],
})
export class AppModule {}
