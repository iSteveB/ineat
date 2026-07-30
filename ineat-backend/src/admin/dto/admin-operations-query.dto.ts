import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum AdminIncidentType {
  INVOICE = 'INVOICE',
  NOTIFICATION = 'NOTIFICATION',
  STRIPE_WEBHOOK = 'STRIPE_WEBHOOK',
  RESEND = 'RESEND',
}

export class AdminIncidentsQueryDto {
  @IsEnum(AdminIncidentType)
  type!: AdminIncidentType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  pageSize?: number;
}

export class AdminQueueJobsQueryDto {
  @IsIn(['waiting', 'active', 'failed'])
  state!: 'waiting' | 'active' | 'failed';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  pageSize?: number;
}
