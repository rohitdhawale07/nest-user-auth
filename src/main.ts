import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips extra fields
      forbidNonWhitelisted: true, // throws error if extra fields exist
      transform: true, // automatically converts types
      exceptionFactory: (errors) => {
        // extract the first error message only
        const firstError = Object.values(errors[0].constraints || {})[0] || 'Validation failed';
        return new BadRequestException(firstError);
      },
    }),
  );

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/', // URL prefix
  });
  // if (process.env.NODE_ENV === 'local') {
  //   app.useStaticAssets(join(__dirname, '..', 'uploads'));
  // }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
