import { PrismaClient } from "@prisma/client";

export async function seedExchangeRates(prisma: PrismaClient) {
  const seedExpiration = new Date("2030-01-01");

  // Delete the seeds so that if / when they change they get recreated
  const existingRates = await prisma.exchangeRate.findMany({
    where: {
      expirationTimestamp: {
        equals: seedExpiration,
      },
    },
  });

  if (!existingRates || existingRates.length === 0) {
    await prisma.exchangeRate.create({
      data: {
        numeratorCurrency: "USD",
        denominatorCurrency: "COP",
        bankRate: 4689.72,
        nobaRate: 4000,
        expirationTimestamp: seedExpiration,
      },
    });

    await prisma.exchangeRate.create({
      data: {
        numeratorCurrency: "COP",
        denominatorCurrency: "USD",
        bankRate: 0.00021,
        nobaRate: 0.00025,
        expirationTimestamp: seedExpiration,
      },
    });
  } else {
    console.log("Exchange rates already seeded");
  }
}
