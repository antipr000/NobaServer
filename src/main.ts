import {  NestFactory } from '@nestjs/core';
import {  Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import {
  WINSTON_MODULE_NEST_PROVIDER,
  WINSTON_MODULE_PROVIDER,
} from 'nest-winston';
import * as morgan from 'morgan';
import { DocumentBuilder,  SwaggerModule } from '@nestjs/swagger';
import { joiToSwagger } from './joi2Swagger';
import { NoUnExpectedKeysValidationPipe, createClassTypeToPropertiesMapFromSwaggerSchemas } from './core/utils/NoUnexpectedKeysValidationPipe';
import { AllExceptionsFilter } from './core/exception/ExceptionsFilter';
import { AuthenticatedUser } from './modules/auth/domain/AuthenticatedUser';
import { SecretProvider } from './config/SecretProvider';
import { ConfigService } from '@nestjs/config';
import * as helmet from 'helmet';

//acutal bootstrapping function
async function bootstrap() {


  await SecretProvider.cacheAllSecrets();

  const app = await NestFactory.create(AppModule);
  const logger: Logger = app.get(WINSTON_MODULE_NEST_PROVIDER); //logger is of Nestjs type  
  const winstonLogger = app.get(WINSTON_MODULE_PROVIDER); //logger of winston type
  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>("apiPrefix");
  winstonLogger.info("Setting API prefix to " + apiPrefix);

  app.enableCors({
    origin: "http://localhost:3000" //In production we are not allowing cors, enable if needed
  });
  // app.use(csurf()); we don't need csurf as we take auth-token from header and not cookies --> https://security.stackexchange.com/questions/166724/should-i-use-csrf-protection-on-rest-api-endpoints?newreg=98a29ea4aaa8448785ffc3ab53b3c475
  app.use(helmet())
  app.useLogger(logger);
  app.setGlobalPrefix(apiPrefix??'');
  app.use(getMorgan(winstonLogger));
  app.useGlobalFilters(new AllExceptionsFilter(winstonLogger));

  //Todo we shouldn't be showing swagger-ui in production or put a admin role on this end-point
  //https://docs.nestjs.com/openapi/introduction
  const config = new DocumentBuilder()
    .setTitle('Noba Server')
    .setDescription('Noba Server API')
    .setVersion('1.0')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, config,  { operationIdFactory: (controllerKey: string, methodKey: string) => methodKey });
  swaggerDocument.components = joiToSwagger(swaggerDocument.components) as any; //merge swagger-plugin generated components with joi generated components
  
  app.useGlobalPipes(
    //we won't accept the keys/fields/attributes in the input if they are not defined in the accepted Type of a controller route
    new NoUnExpectedKeysValidationPipe(createClassTypeToPropertiesMapFromSwaggerSchemas(swaggerDocument.components.schemas), false)
  );
  
  //TODO IMPORTANT show swagger ui only in non-production
  SwaggerModule.setup('swagger-ui', app, swaggerDocument);

  const port = 8080;
  logger.log(`Starting Noba service on port ${port}`, 'main.ts');
  await app.listen(port);
}

function getMorgan(winstonLogger) {
  const morganOptions = {
    stream: {
      write: (text: string) => {
        winstonLogger.info(text.trim(), { context: 'Request' });
      },
    },
  };

  return morgan((tokens, req, res) => {

    const userID = ((req as any).user as AuthenticatedUser)?.uid;

    return [
      userID??"noauth",
      req.socket.remoteAddress, //TODO any privacy issue here?  as developers can see both uid and ip, best practice? 
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens.res(req, res, 'content-length'), '-',
      tokens['response-time'](req, res), 'ms'
    ].join(' ')}, morganOptions);
}


//start
bootstrap();
