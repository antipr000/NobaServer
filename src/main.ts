import { INestApplication } from "@nestjs/common";
import { bootstrap } from "./server";
import { bootStrapPrivateEndpoints } from "./server.private";

async function main() {
  const app: INestApplication = await bootstrap({});

  const privateApp: INestApplication = await bootStrapPrivateEndpoints({});

  const port = 8080;
  await app.listen(port);

  const privatePort = 9000;
  await privateApp.listen(privatePort);
}

main();
