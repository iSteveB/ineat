import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export enum SupportSubject {
  ACCOUNT = 'ACCOUNT',
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE',
  ORDER_OR_SUBSCRIPTION = 'ORDER_OR_SUBSCRIPTION',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  OTHER = 'OTHER',
}

export class CreateSupportMessageDto {
  @ApiProperty({ enum: SupportSubject, example: SupportSubject.FEATURE_REQUEST })
  @IsEnum(SupportSubject)
  subject!: SupportSubject;

  @ApiProperty({ minLength: 10, maxLength: 2000 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message!: string;
}
