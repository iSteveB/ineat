import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum AdminDiscountType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum AdminDiscountDuration {
  ONCE = 'ONCE',
  REPEATING = 'REPEATING',
  FOREVER = 'FOREVER',
}

export class CreatePromotionCodeDto {
  @IsString()
  @Matches(/^[A-Za-z0-9-]+$/)
  @MinLength(3)
  @MaxLength(50)
  code!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @IsEnum(AdminDiscountType)
  discountType!: AdminDiscountType;

  @ValidateIf(
    (dto: CreatePromotionCodeDto) =>
      dto.discountType === AdminDiscountType.PERCENT,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  percentOff?: number;

  @ValidateIf(
    (dto: CreatePromotionCodeDto) =>
      dto.discountType === AdminDiscountType.FIXED,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountOff?: number;

  @IsEnum(AdminDiscountDuration)
  duration!: AdminDiscountDuration;

  @ValidateIf(
    (dto: CreatePromotionCodeDto) =>
      dto.duration === AdminDiscountDuration.REPEATING,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36)
  durationInMonths?: number;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsBoolean()
  firstTimeOnly!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripeCustomerId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class AdminReasonDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
