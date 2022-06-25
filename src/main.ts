import { INestApplication } from "@nestjs/common";
import { bootstrap } from "./server";

async function main() {
  const app: INestApplication = await bootstrap({});

  const port = 8080;
  await app.listen(port);
}

main()