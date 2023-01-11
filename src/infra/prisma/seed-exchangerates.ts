import { PrismaClient } from "@prisma/client";

export async function seedExchangeRates(prisma: PrismaClient) {
  let result = await prisma.exchangeRate.findFirst({ where: { denominatorCurrency: "USD", numeratorCurrency: "COP" } });
  if (!result) {
    const usdcop = await prisma.exchangeRate.create({
      data: {
        denominatorCurrency: "USD",
        numeratorCurrency: "COP",
        bankRate: 5000,
        nobaRate: 4000,
        expirationTimestamp: new Date("2030-01-01"),
      },
    });
  }

  result = await prisma.exchangeRate.findFirst({ where: { denominatorCurrency: "COP", numeratorCurrency: "USD" } });
  if (!result) {
    const copusd = await prisma.exchangeRate.create({
      data: {
        denominatorCurrency: "COP",
        numeratorCurrency: "USD",
        bankRate: 0.0002,
        nobaRate: 0.00025,
        expirationTimestamp: new Date("2030-01-01"),
      },
    });
  }
}
