import { IsDateString, IsIn, IsOptional } from 'class-validator';

export const adminDashboardPeriods = ['7d', '30d', '90d', 'custom'] as const;
export type AdminDashboardPeriod = (typeof adminDashboardPeriods)[number];

export class AdminDashboardQueryDto {
  @IsOptional()
  @IsIn(adminDashboardPeriods)
  period: AdminDashboardPeriod = '30d';

  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;
}
