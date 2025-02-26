import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // enable cors
  // app.enable
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('WhatsApp API')
    .setDescription('API for sending WhatsApp messages via WhatsApp Web')
    .setVersion('1.0')
    .addTag('WhatsApp')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
void bootstrap();
