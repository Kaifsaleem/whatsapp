import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { InitializeSessionDto } from './dto/initialize-session.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SendMessageDto } from './dto/create-message.dto';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('initialize')
  @ApiResponse({ status: 200, description: 'Session initialized successfully' })
  initializeSession(@Body() initializeSessionDto: InitializeSessionDto) {
    return this.whatsappService.initializeSession(initializeSessionDto.userId);
  }

  @Get('qr/:userId')
  @ApiOperation({ summary: 'Get WhatsApp QR Code as Base64 Image' })
  @ApiResponse({
    status: 200,
    description: 'QR Code for WhatsApp Login',
    schema: {
      example: { qrCode: 'data:image/png;base64,iVBORw...' },
    },
  })
  getQRCode(@Param('userId') userId: string) {
    return this.whatsappService.getQRCode(userId);
  }

  @Post('send')
  sendMessage(@Body() sendMessageDto: SendMessageDto) {
    return this.whatsappService.sendMessage(
      sendMessageDto.userId,
      sendMessageDto.to,
      sendMessageDto.message,
    );
  }

  //dataBase masseges

  @Get('messages/:userId')
  getAllMessages(@Param('userId') userId: string) {
    return this.whatsappService.getAllMessages(userId);
  }

  @Get('chats/:userId')
  async getChats(@Param('userId') userId: string) {
    return await this.whatsappService.getChats(userId);
  }

  // return message of specific contact id limit is apply to 10

  @Get('messages/:userId/:chatId')
  async getMessages(
    @Param('userId') userId: string,
    @Param('chatId') chatId: string,
  ) {
    return await this.whatsappService.getMessages(userId, chatId);
  }

  // return contact's details.
  @Get('user/:userId/:contactId')
  async getUserInfo(
    @Param('userId') userId: string,
    @Param('contactId') contactId: string,
  ) {
    return await this.whatsappService.getUserInfo(userId, contactId);
  }

  @Get('contacts/:userId')
  async getContacts(@Param('userId') userId: string) {
    return await this.whatsappService.getContacts(userId);
  }
  @Delete('logout/:userId')
  logout(@Param('userId') userId: string) {
    return this.whatsappService.logout(userId);
  }

  @Delete('destroy/:userId')
  destroy(@Param('userId') userId: string) {
    return this.whatsappService.destroy(userId);
  }
}
