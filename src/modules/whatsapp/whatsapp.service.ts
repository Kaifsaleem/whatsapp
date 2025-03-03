/* eslint-disable @typescript-eslint/no-misused-promises */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './message.schema';
import { EventsService } from '../events/events.service';

@Injectable()
export class WhatsAppService {
  private clients = new Map<string, Client>(); // Store active sessions
  private qrCodes = new Map<string, string>(); // Store QR codes
  private logger = new Logger(WhatsAppService.name);

  private messageEventEmitters = new Map<string, EventEmitter>();

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private eventService: EventsService,
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

    // Add message event listener
    client.on('message', async (message) => {
      const formattedMessage = {
        id: message.id.id,
        from: message.from,
        to: message.to,
        text: message.body,
        timestamp: message.timestamp,
        time: this.formatTimestamp(message.timestamp),
        timeAgo: this.formatTimeAgo(message.timestamp),
        fromMe: message.fromMe,
      };

      this.eventService.emit(`whatsapp.message.${userId}`, formattedMessage);

      // Store message in database
      await this.storeMessage(message.from, message.to, message.body, userId);

      // // Emit event if there's an active listener for this user
      // if (this.messageEventEmitters.has(userId)) {
      //   this.messageEventEmitters.get(userId).emit('message', formattedMessage);
      // }
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
  async sendMessage(from: string, to: string, message: string) {
    const client = this.getClient(from);
    await client.sendMessage(to, message);
    return this.storeMessage(client.info.wid._serialized, to, message, from);
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
    if (!client) {
      throw new NotFoundException('No active session for this user.');
    }
    const chats = await client.getChats();
    // i want to map all data inside user array which return on response of getChats

    // const users = chats.map((chat) => ({
    //   id: chat.id._serialized,
    //   name: chat.name,
    //   isGroup: chat.isGroup,
    //   timestamp: chat.timestamp,
    //   unreadCount: chat.unreadCount,
    //   pinned: chat.pinned,
    //   isMuted: chat.isMuted,
    //   muteExpiration: chat.muteExpiration,
    //   online_status: chat.
    //   lastMessage: chat.lastMessage ? chat.lastMessage.body : null,

    //   // lastMessage: lastMessage?.body || null,
    // }));
    const users = await Promise.all(
      chats.map(async (chat) => {
        // Get basic info from WhatsApp
        const basicInfo = {
          id: chat.id._serialized,
          name: chat.name,
          unReadChatCount: chat.unreadCount,
          lastMessage: chat.lastMessage ? chat.lastMessage.body : null,
          // The timestamp could be formatted as "2h ago" using a utility function
          time: chat.lastMessage
            ? this.formatTimeAgo(chat.lastMessage.timestamp)
            : null,
        };

        // Fetch or mock additional user data
        // In a real app, you would fetch this from your database using the chat ID or user number
        const extendedInfo = await this.getUserExtendedInfo(
          chat.id._serialized,
          userId,
        );

        return {
          ...basicInfo,
          ...extendedInfo,
          online_status: this.getOnlineStatus(chat.id._serialized, userId), // You'll need to implement this method
        };
      }),
    );
    return { users };
  }

  private formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp * 1000; // WhatsApp timestamps are in seconds

    // For messages less than an hour old, show minutes
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;

    // For messages less than a day old, show hours
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h ago`;

    // For older messages, show days
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  private async getUserExtendedInfo(chatId: string, userId: string) {
    // In a real app, fetch this from your database
    // This is just mock data for demonstration

    const client = this.getClient(userId);
    const pic = await client.getProfilePicUrl(chatId);
    return {
      company: 'ABC Pvt Ltd',
      role: 'Sr. Customer Manager',
      work_email: 'user_work@company.com',
      personal_email: 'user@company.com',
      work_phone: '123-456-7890',
      personal_phone: chatId.split('@')[0],
      location: 'Port Narcos',
      avatar: pic,
      status: 'Technical Department',
      birthdayText: 'Happy Birthday!',
    };
  }

  private getOnlineStatus(chatId: string, userId: string) {
    // const client = await this.getClient(userId);

    // try {
    //   // Subscribe to presence updates for this contact
    //   // Note: This needs to be called only once per contact
    //   if (!this.presenceSubscriptions.has(chatId)) {
    //     await client.subscribePresenceUpdates(chatId);
    //     this.presenceSubscriptions.add(chatId);
    //   }

    //   // Check if we have a cached presence state
    //   const presenceState = this.presenceStates.get(chatId);

    //   if (presenceState) {
    //     return presenceState.available ? 'available' : 'unavailable';
    //   }

    //   return 'unknown';
    // } catch (error) {
    //   this.logger.error(`Error getting presence for ${chatId}`, error);
    //   return 'unknown';
    // }
    // check online status of chat id

    // You'll need to implement logic to determine online status
    // This could be from presence updates or other source
    // For now returning default value
    return 'available';
  }

  /**
   * Get Messages from a Specific Chat
   */
  async getMessages(userId: string, chatId: string) {
    const client = this.getClient(userId);
    const chat = await client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit: 10 });

    return messages.map(({ id, from, to, body, timestamp }) => ({
      id: id.id,
      from,
      to,
      text: body,
      time: this.formatTimestamp(timestamp),
    }));
  }

  /**
   * Convert Unix timestamp to formatted date
   */
  private formatTimestamp(timestamp: number): string {
    // WhatsApp timestamps are in seconds, JavaScript Date expects milliseconds
    const date = new Date(timestamp * 1000);

    // Format as a readable date string (e.g., "Feb 28, 2025, 3:45 PM")
    return date.toLocaleString();
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
