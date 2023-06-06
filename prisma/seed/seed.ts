import { PrismaClient } from "@prisma/client";
import { seedAdmins } from "./seed-admins";
import { seedConsumers } from "./seed-consumers";
import { seedEmployers } from "./seed-employers";
import { seedEventsAndTemplates } from "./seed-events";
import { seedEmployees } from "./seed-employees";
import { seedScheduledReminders } from "./seed-scheduled-reminders";
import { seedExchangeRates } from "./seed-exchangerates";

const prisma = new PrismaClient();

async function main() {
  // Only seed non-production environments
  if (process.env.NODE_ENV !== "production") {
    console.log("Seeding data...");
    await seedAdmins(prisma);
    await seedExchangeRates(prisma);
    await seedConsumers(prisma);
    await seedEmployers(prisma);
    await seedEmployees(prisma);
  } else {
    console.log("Not seeding in production environment");
  }

  await seedEventsAndTemplates(prisma); // Events and templates needs to be seeded in all environments
  await seedScheduledReminders(prisma);
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
