import { Injectable, MessageEvent } from '@nestjs/common';
// import { CreateEventDto } from './dto/create-event.dto';
// import { UpdateEventDto } from './dto/update-event.dto';
import { Observable, Subject } from 'rxjs';
import { EventEmitter } from 'stream';
// import { EventData } from '../../common/types';

export type EventData = {
  type: string;
  data: any;
};

@Injectable()
export class EventsService {
  private eventEmitter = new EventEmitter();
  // create(createEventDto: CreateEventDto) {
  //   return 'This action adds a new event';
  // }

  // findAll() {
  //   return `This action returns all events`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} event`;
  // }

  // update(id: number, updateEventDto: UpdateEventDto) {
  //   return `This action updates a #${id} event`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} event`;
  //s sdfj
  // }

  // User connections
  private userConnections = new Map<string, Subject<MessageEvent>>();

  // Initialize or get an existing user's event stream
  getUserEvents$(userId: string): Observable<MessageEvent> {
    const id = String(userId);
    if (!this.userConnections.has(id)) {
      this.userConnections.set(id, new Subject<MessageEvent>());
    }
    return this.userConnections.get(id)!.asObservable();
  }

  // Emit a Event to a specific user
  sendEventToUser(userId: string, data: EventData) {
    const userStream = this.userConnections.get(String(userId));
    if (userStream) {
      userStream.next({ data });
    }
  }

  // Cleanup: Remove user connection when they disconnect
  removeUser(userId: string) {
    this.userConnections.delete(userId);
  }

  emit(event: string, data: any) {
    this.eventEmitter.emit(event, data);
  }

  subscribe(event: string, listener: (data: any) => void): () => void {
    this.eventEmitter.on(event, listener);

    // Return an unsubscribe function
    return () => {
      this.eventEmitter.off(event, listener);
    };
  }
}
