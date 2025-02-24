import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
// import { Message } from './modules/message/message.schema';
import { MessageModule } from './modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    // Load .env variables
    MongooseModule.forRoot('Enter your DB string here'),
    MessageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
