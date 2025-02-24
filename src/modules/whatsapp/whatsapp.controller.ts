import { Controller, Get, Post, Body } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateMessageDto } from './dto/create-message.dto';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('qr')
  @ApiOperation({ summary: 'Get QR code to log in' })
  @ApiResponse({ status: 200, description: 'QR Code fetched successfully' })
  getQRCode() {
    return this.whatsappService.getQRCode();
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a WhatsApp Message' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  async sendMessage(@Body() createMessageDto: CreateMessageDto) {
    // const { to, message } = body;
    return this.whatsappService.sendMessage(createMessageDto);
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get all stored messages' })
  async getAllMessages() {
    return this.whatsappService.getAllMessages();
  }
}
