import { INestApplication } from "@nestjs/common";
import { bootstrap } from "./server";

async function main() {
  const app: INestApplication = await bootstrap({});

  // const privateApp: INestApplication = await bootstrapPrivateEndpoints({});

  const port = 8080;
  await app.listen(port);

  // const privatePort = 9000;
  // await privateApp.listen(privatePort);
}

main();
