import { PartialType } from '@nestjs/swagger';
import { SendMessageDto } from './create-message.dto';

export class UpdateMessageDto extends PartialType(SendMessageDto) {}
