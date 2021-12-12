import { Transform } from 'class-transformer';
import { ArrayUnique, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { CurrencyType } from '../currency-type.enum';

export class GetBalanceDto {
  @ApiProperty({
    type: 'string',
  })
  @IsString()
  addr: string;

  @ApiPropertyOptional({
    type: Date,
  })
  @IsOptional()
  @IsDateString()
  from?: Date | null;

  @ApiPropertyOptional({
    type: Date,
  })
  @IsOptional()
  @IsDateString()
  to?: Date | null;

  @ApiProperty({
    isArray: true,
    required: true,
    enum: CurrencyType,
  })
  @IsEnum(CurrencyType, { each: true })
  @ArrayUnique()
  @Transform((i: any) => {
    return (typeof i.value == 'string') ? i.value.split(',') : i.value;
  })
  currency: CurrencyType[];
}
