import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    exceptionFactory: (errors: ValidationError[]) => {
      const errorDescriptions = errors.map((error) => {
        const constraints = error.constraints ? Object.values(error.constraints).join(', ') : '';
        return constraints;
      });

      return new BadRequestException({
        error_code: 'INVALID_DATA',
        error_description: errorDescriptions.join(', '),
      });
    },
    stopAtFirstError: true,
  }));
  await app.listen(8000);
}
bootstrap();
