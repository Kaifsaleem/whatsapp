import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './message.schema';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class WhatsAppService {
  private client: Client;
  private qrCode: string | null = null;
  private isReady = false;
  private logger = new Logger(WhatsAppService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {
    this.client = new Client({
      authStrategy: new LocalAuth(), // Stores session locally
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Fixes sandbox issues in Linux
      },
    });

    this.client.on('qr', (qr) => {
      this.logger.log('Scan this QR Code to log in:');
      this.qrCode = qr;
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.logger.log('WhatsApp Client is Ready!');
      this.isReady = true;
      this.qrCode = null; // QR is no longer needed after login
    });

    this.client.on('message', (msg) => {
      this.storeMessage(msg.from, msg.to, msg.body).catch((error) => {
        this.logger.error('Error storing message:', error);
      });
    });

    this.client.initialize().catch((error) => {
      this.logger.error('Error initializing WhatsApp client:', error);
    });
  }

  getQRCode() {
    if (this.isReady) {
      return { message: 'WhatsApp is already logged in' };
    }
    return { qrCode: this.qrCode };
  }

  async sendMessage(createMessageDto: CreateMessageDto) {
    const { to, message } = createMessageDto;
    if (!this.isReady) {
      throw new Error('WhatsApp Client is not ready. Scan the QR Code first.');
    }
    await this.client.sendMessage(to, message);
    return this.storeMessage(this.client.info.wid._serialized, to, message);
  }

  private async storeMessage(
    sender: string,
    receiver: string,
    message: string,
  ) {
    const newMessage = new this.messageModel({ sender, receiver, message });
    return newMessage.save();
  }

  async getAllMessages() {
    return this.messageModel.find().exec();
  }
}
