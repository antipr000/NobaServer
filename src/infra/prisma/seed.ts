import { PrismaClient } from "@prisma/client";
import { seedAdmins } from "./seed-admins";
import { seedExchangeRates } from "./seed-exchangerates";
const prisma = new PrismaClient();

async function main() {
  // Only seed non-production environments
  if (process.env.NODE_ENV !== "production") {
    console.log("Seeding data...");
    await seedAdmins(prisma);
    await seedExchangeRates(prisma);
  } else {
    console.log("Not seeding in production environment");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
