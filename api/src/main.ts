import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupBodyParsers } from './payment/body-parsers.js';

const app = await NestFactory.create(AppModule, { bodyParser: false });
setupBodyParsers(app);
await app.listen(process.env.PORT ?? 3000);
