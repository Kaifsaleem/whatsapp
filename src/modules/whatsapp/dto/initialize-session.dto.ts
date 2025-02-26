import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InitializeSessionDto {
  @ApiProperty({
    type: 'string',
    description: 'User ID of the user to initialize the session',
    required: true,
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
