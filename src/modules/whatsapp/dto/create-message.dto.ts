/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsNotEmpty, IsString } from 'class-validator';
export class CreateMessageDto {
  // export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  to: string; // WhatsApp number in international format (e.g., "1234567890@c.us")

  @IsString()
  @IsNotEmpty()
  message: string; // The message to send
}

// }
