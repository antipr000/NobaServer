import { INestApplication, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, OpenAPIObject, SwaggerDocumentOptions, SwaggerModule } from "@nestjs/swagger";
import { urlencoded, json } from "express";
import * as helmet from "helmet";
import * as morgan from "morgan";
import { WINSTON_MODULE_NEST_PROVIDER, WINSTON_MODULE_PROVIDER } from "nest-winston";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./core/exception/ExceptionsFilter";
import {
  createClassTypeToPropertiesMapFromSwaggerSchemas,
  NoUnExpectedKeysValidationPipe,
} from "./core/utils/NoUnexpectedKeysValidationPipe";
import { joiToSwagger } from "./joi2Swagger";
import { AuthenticatedUser } from "./modules/auth/domain/AuthenticatedUser";
import { writeFileSync } from "fs";
import { UserModule } from "./modules/user/user.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TransactionModule } from "./modules/transactions/transaction.module";

//acutal bootstrapping function
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger: Logger = app.get(WINSTON_MODULE_NEST_PROVIDER); //logger is of Nestjs type
  const winstonLogger = app.get(WINSTON_MODULE_PROVIDER); //logger of winston type
  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>("apiPrefix");
  const appEnvType = configService.get<string>("envType");
  winstonLogger.info("Setting API prefix to " + apiPrefix + ", app enviornment is " + appEnvType);

  app.enableCors(); //allowing all origins for now but in future we can dynamically set allowed origins based on the enviornment (localhost:3000, noba.com etc)
  // app.use(csurf()); we don't need csurf as we take auth-token from header and not cookies --> https://security.stackexchange.com/questions/166724/should-i-use-csrf-protection-on-rest-api-endpoints?newreg=98a29ea4aaa8448785ffc3ab53b3c475
  app.use(helmet());
  app.useLogger(logger);
  app.setGlobalPrefix(apiPrefix ?? "");
  app.use(getMorgan(winstonLogger));
  app.useGlobalFilters(new AllExceptionsFilter(winstonLogger));
  // the next two lines did the trick
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  //https://docs.nestjs.com/openapi/introduction

  // Config and doc generation options for PUBLIC-facing APIs
  const publicConfig = new DocumentBuilder()
    .setTitle("Noba Server")
    .setDescription("Noba Server API " + `(${appEnvType.toUpperCase()})`)
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      "JWT-auth",
    )
    .addServer("https://api.noba.com/")
    .addServer("http://localhost:8080")
    .build();

  // Any API which we want to expose publicly (to partners) must be explicitly declared here
  const publicOptions = {
    include: [AppModule, AuthModule, UserModule, TransactionModule],
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  };

  // Config and doc generation options for all APIs, which includes public & private
  const privateConfig = new DocumentBuilder()
    .setTitle("Noba Server")
    .setDescription("Noba Server API (Internal) " + `(${appEnvType.toUpperCase()})`)
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      "JWT-auth",
    )
    .addServer("https://api.noba.com/")
    .addServer("http://localhost:8080")
    .build();

  const privateOptions = {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  };

  const swaggerDocumentPublic = generateSwaggerDoc("swagger.json", app, publicConfig, publicOptions);
  const swaggerDocumentPrivate = generateSwaggerDoc("swagger-internal.json", app, privateConfig, privateOptions);

  // Expose /noba-api for public APIs and /noba-api-internal for all APIs (public & private)
  SwaggerModule.setup("noba-api", app, swaggerDocumentPublic);
  SwaggerModule.setup("noba-api-internal", app, swaggerDocumentPrivate);

  const port = 8080;
  logger.log(`Starting Noba service on port ${port}`, "main.ts");
  await app.listen(port);
}

function generateSwaggerDoc(
  filename: string,
  app: INestApplication,
  config: Omit<OpenAPIObject, "paths">,
  options: SwaggerDocumentOptions,
) {
  const swaggerDocument = SwaggerModule.createDocument(app, config, options);
  swaggerDocument.components = joiToSwagger(swaggerDocument.components) as any; //merge swagger-plugin generated components with joi generated components

  writeFileSync("./" + filename, JSON.stringify(swaggerDocument), { encoding: "utf-8" });
  app.useGlobalPipes(
    //we won't accept the keys/fields/attributes in the input if they are not defined in the accepted Type of a controller route
    new NoUnExpectedKeysValidationPipe(
      createClassTypeToPropertiesMapFromSwaggerSchemas(swaggerDocument.components.schemas),
      false,
    ),
  );
  return swaggerDocument;
}

function getMorgan(winstonLogger) {
  const morganOptions = {
    stream: {
      write: (text: string) => {
        winstonLogger.info(text.trim(), { context: "Request" });
      },
    },
  };

  return morgan((tokens, req, res) => {
    const userID = ((req as any).user as AuthenticatedUser)?.uid;

    return [
      userID ?? "noauth",
      req.socket.remoteAddress, //TODO any privacy issue here?  as developers can see both uid and ip, best practice?
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens.res(req, res, "content-length"),
      "-",
      tokens["response-time"](req, res),
      "ms",
    ].join(" ");
  }, morganOptions);
}

//start
bootstrap();
