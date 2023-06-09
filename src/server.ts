import { INestApplication, Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, OpenAPIObject, SwaggerDocumentOptions, SwaggerModule } from "@nestjs/swagger";
import { json, urlencoded, text } from "express";
import { writeFileSync } from "fs";
import helmet from "helmet";
import morgan from "morgan";
import { WINSTON_MODULE_NEST_PROVIDER, WINSTON_MODULE_PROVIDER, WinstonModule } from "nest-winston";
import { AppModule } from "./app.module";
import { DefaultExceptionsFilter } from "./core/exception/filters/DefaultExceptionsFilter";
import {
  createClassTypeToPropertiesMapFromSwaggerSchemas,
  NoUnExpectedKeysValidationPipe,
} from "./core/utils/NoUnexpectedKeysValidationPipe";
import { joiToSwagger } from "./joi2Swagger";
import { AppEnvironment, getEnvironmentName } from "./config/ConfigurationUtils";
import winston from "winston";

// `environmentVariables` stores extra environment varaibles that needs to be loaded before the app startup.
// This will come handy while running tests & inserting any dependent environment varaibles.
export const bootstrap = async (environmentVariables: Record<string, string>): Promise<INestApplication> => {
  const environmentKeys = Object.keys(environmentVariables);
  for (let i = 0; i < environmentKeys.length; i++) {
    const environmentKey = environmentKeys[i];
    process.env[environmentKey] = environmentVariables[environmentKey];
  }
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
  });

  const logger: Logger = app.get(WINSTON_MODULE_NEST_PROVIDER); //logger is of Nestjs type
  const winstonLogger: winston.Logger = app.get(WINSTON_MODULE_PROVIDER); //logger of winston type

  const appEnvType: AppEnvironment = getEnvironmentName();

  app.enableCors(); //allowing all origins for now but in future we can dynamically set allowed origins based on the environment (localhost:3000, noba.com etc)
  // app.use(csurf()); we don't need csurf as we take auth-token from header and not cookies --> https://security.stackexchange.com/questions/166724/should-i-use-csrf-protection-on-rest-api-endpoints?newreg=98a29ea4aaa8448785ffc3ab53b3c475
  app.use(helmet());
  app.useLogger(logger);
  app.use(getMorgan(winstonLogger));
  app.useGlobalFilters(new DefaultExceptionsFilter(winstonLogger));
  // the next two lines did the trick
  // app.use(json({ limit: "50mb" }));
  // app.use(urlencoded({ extended: true, limit: "50mb" }));

  // Config and doc generation options for all APIs, which includes public & private
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Noba Server")
    .setDescription(`Noba Server API (Internal) (${appEnvType.toUpperCase()})`)
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      "JWT-auth",
    )
    .addServer("/")
    .build();

  const swaggerOptions = {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  };

  const swaggerDocument = generateSwaggerDoc("swagger-internal.json", app, swaggerConfig, swaggerOptions);
  SwaggerModule.setup("noba-api-internal", app, swaggerDocument);

  return app;
};

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
    new ValidationPipe({
      forbidUnknownValues: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  return swaggerDocument;
}

function getMorgan(winstonLogger: winston.Logger) {
  const morganOptions = {
    stream: {
      write: (text: string) => {
        winstonLogger.info(text.trim(), { context: "Request" });
      },
    },
  };

  return morgan((tokens, req, res) => {
    const userID = ((req as any).user as any)?.entity?.props?.id;

    return [
      userID ?? "unauthenticated-request",
      req.headers["x-forwarded-for"] || req.socket.remoteAddress, //TODO any privacy issue here?  as developers can see both uid and ip, best practice?
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
