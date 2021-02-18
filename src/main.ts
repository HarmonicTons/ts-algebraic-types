import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {main} from "./algebraic-types"

try {
    main();
    console.log("success")
} catch (error) {
    console.error(error);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
