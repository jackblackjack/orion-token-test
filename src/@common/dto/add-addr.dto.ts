import { IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class AddAddrDto {
  @ApiProperty({
    type: 'string',
  })
  @IsString()
  addr: string;
}
