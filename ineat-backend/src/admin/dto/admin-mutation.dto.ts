import { UserRole } from '../../../prisma/generated/prisma/enums';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateRoleDto {
  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class RetryQueueJobDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
