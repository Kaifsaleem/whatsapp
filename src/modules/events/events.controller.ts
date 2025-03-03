import {
  Controller,
  // Get,
  // Post,
  // Body,
  // Patch,
  // Param,
  // Delete,
  Sse,
  Request,
  MessageEvent,
  Param,
} from '@nestjs/common';
import { EventsService } from './events.service';
// import { CreateEventDto } from './dto/create-event.dto';
// import { UpdateEventDto } from './dto/update-event.dto';
// import Auth from '../../common/decorators/auth.decorator';
// import { ExRequest } from '../../common/types';
import { Observable } from 'rxjs';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // @Post()
  // create(@Body() createEventDto: CreateEventDto) {
  //   return this.eventsService.create(createEventDto);
  // }

  // @Get()
  // findAll() {
  //   return this.eventsService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.eventsService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
  //   return this.eventsService.update(+id, updateEventDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.eventsService.remove(+id);
  // }

  @Sse('live')
  // @Auth()
  subscribe(@Param('userId') userId: string): Observable<MessageEvent> {
    return this.eventsService.getUserEvents$(userId);
  }

  // Cleanup connections when the app is shutting down
  onModuleDestroy() {
    this.eventsService.removeUser('all');
  }
}
