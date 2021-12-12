import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { CONFIG_ENV_OPTIONS_REGISTER_AS } from './config/constants';
import { IEnvOptions } from './config/interfaces/env-options.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const options = new DocumentBuilder()
  .setTitle('Orion test API')
  .setDescription('')
  .setVersion('0.1')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth',
  )
  .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/swagger', app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      showRequestDuration: true,
    },
  });

  const configService: ConfigService = app.get<ConfigService>(ConfigService);
  const envOptions = configService.get<IEnvOptions>(CONFIG_ENV_OPTIONS_REGISTER_AS);

  // Check that port is not exists.
  if (!envOptions?.port) {
    throw new Error('Public port has not found!');
  }
  await app.listen(envOptions.port);
}
(async () => await bootstrap())();
