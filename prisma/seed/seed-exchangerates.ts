import { PrismaClient } from "@prisma/client";

export async function seedExchangeRates(prisma: PrismaClient) {
  const seedExpiration = new Date("2030-01-01");

  // Delete the seeds so that if / when they change they get recreated
  await prisma.exchangeRate.deleteMany({
    where: {
      expirationTimestamp: {
        equals: seedExpiration,
      },
    },
  });

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
}
