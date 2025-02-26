import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './message.schema';

@Injectable()
export class WhatsAppService {
  private clients = new Map<string, Client>(); // Store active sessions
  private qrCodes = new Map<string, string>(); // Store QR codes
  private logger = new Logger(WhatsAppService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  /**
   * Initialize WhatsApp Session for a User
   */
  async initializeSession(userId: string) {
    if (this.isUserLoggedIn(userId)) {
      return { message: 'User is already logged in.' };
    }

    const client = new Client({
      authStrategy: new LocalAuth({ clientId: userId }),
      puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    });

    client.on('qr', (qr) => {
      this.logger.log(`Generating QR Code for User ${userId}`);

      qrcode
        .toDataURL(qr)
        .then((base64QR) => {
          this.qrCodes.set(userId, base64QR);
        })
        .catch((error) => {
          this.logger.error(
            `Failed to generate QR Code for User ${userId}`,
            error,
          );
        });
    });

    client.on('ready', () => {
      this.logger.log(`WhatsApp Client Ready for User: ${userId}`);
      this.qrCodes.delete(userId); // Remove QR after successful login
    });

    await client.initialize();
    this.clients.set(userId, client);

    return { message: `Session initialized for ${userId}` };
  }

  /**
   * Check if a user is logged in
   */
  private isUserLoggedIn(userId: string): boolean {
    return (
      this.clients.has(userId) &&
      this.clients.get(userId)?.info?.wid !== undefined
    );
  }

  /**
   * Get QR Code for Authentication
   */
  getQRCode(userId: string) {
    if (this.isUserLoggedIn(userId)) {
      return { message: 'User is already logged in.' };
    }

    return this.qrCodes.get(userId)
      ? { qrCode: this.qrCodes.get(userId) }
      : { error: 'No QR Code available. Call initializeSession first.' };
  }

  /**
   * Get WhatsApp Client Instance
   */
  private getClient(userId: string): Client {
    const client = this.clients.get(userId);
    if (!client) {
      throw new NotFoundException(
        `No active WhatsApp session for userId: ${userId}`,
      );
    }
    return client;
  }

  /**
   * Send a WhatsApp Message
   */
  async sendMessage(userId: string, to: string, message: string) {
    const client = this.getClient(userId);
    await client.sendMessage(to, message);
    return this.storeMessage(client.info.wid._serialized, to, message, userId);
  }

  /**
   * Store Message in MongoDB
   */
  private async storeMessage(
    sender: string,
    receiver: string,
    message: string,
    userId: string,
  ) {
    return new this.messageModel({ sender, receiver, message, userId }).save();
  }

  /**
   * Retrieve All Messages for a Specific User
   */
  async getAllMessages(userId: string) {
    return this.messageModel.find({ userId }).exec();
  }

  /**
   * Logout User and Remove Session
   */
  // logout()	When you want to log out the user but keep the client running. The user can log in again without restarting the service.
  async logout(userId: string) {
    if (!this.clients.has(userId)) {
      return { message: 'No active session to logout.' };
    }

    await this.clients.get(userId)?.logout();
    this.clients.delete(userId);
    return { message: `User ${userId} logged out.` };
  }

  // complete shut down the session
  // destroy()	When you want to fully stop the WhatsApp session, remove all resources, and require reinitialization for further usage.
  async destroy(userId: string) {
    if (!this.clients.has(userId)) {
      return { message: 'No active session to logout.' };
    }

    await this.clients.get(userId)?.destroy();
    this.clients.delete(userId);
    return { message: `User ${userId} logged out.` };
  }

  /**
   * Get User's WhatsApp Chats with last message
   */
  async getChats(userId: string) {
    const client = this.getClient(userId);
    const chats = await client.getChats();
    const users = chats.map(({ id, name, lastMessage }) => ({
      id: id._serialized,
      name,
      lastMessage: lastMessage?.body || null,
    }));
    return users;
  }

  /**
   * Get Messages from a Specific Chat
   */
  async getMessages(userId: string, chatId: string) {
    const client = this.getClient(userId);
    const chat = await client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: 10 });

    return messages.map(({ from, body, timestamp }) => ({
      from,
      body,
      timestamp,
    }));
  }

  /**
   * Get WhatsApp Contact Info
   */
  async getUserInfo(userId: string, contactId: string) {
    const client = this.getClient(userId);
    const contact = await client.getContactById(contactId);
    return {
      id: contact.id._serialized,
      name: contact.pushname || contact.name,
      number: contact.number,
    };
  }

  /**
   * Get All WhatsApp Contacts
   */
  async getContacts(userId: string) {
    const client = this.getClient(userId);
    const contacts = await client.getContacts();
    return contacts.map(({ id, pushname, name, number }) => ({
      id: id._serialized,
      name: pushname || name,
      number,
    }));
  }
}
