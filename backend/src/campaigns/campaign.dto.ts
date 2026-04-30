import { IsString, IsNumber, IsArray, IsDateString, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MilestoneDto {
  @ApiProperty() @IsString() description: string;
  @ApiProperty() @IsNumber() @Min(1) targetAmount: number;
}

export class CreateCampaignDto {
  @ApiProperty() @IsString() creator: string;
  @ApiProperty() @IsNumber() @Min(1) goal: number;
  @ApiProperty() @IsString() token: string;
  @ApiProperty() @IsDateString() deadline: string;
  @ApiProperty({ type: [MilestoneDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => MilestoneDto)
  milestones: MilestoneDto[];
}
