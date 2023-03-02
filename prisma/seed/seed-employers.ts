import { PrismaClient } from "@prisma/client";

function addDays(date: Date, days: number): Date {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function seedEmployers(prisma: PrismaClient) {
  for (let i = 1; i <= 3; i++) {
    await prisma.employer.upsert({
      where: { referralID: `TestEmployerReferralID${i}` },
      update: {
        // Update payrollDates to be current
        payrollDates: [
          addDays(new Date(), i).toISOString().split("T")[0],
          addDays(new Date(), i + 30)
            .toISOString()
            .split("T")[0],
          addDays(new Date(), i + 60)
            .toISOString()
            .split("T")[0],
        ],
      },
      create: {
        referralID: `TestEmployerReferralID${i}`,
        name: `Test Employer ${i}`,
        logoURI: `https://noba.com/employer${i}.png`,
        leadDays: i,
        maxAllocationPercent: i * 10,
        bubbleID: `TestEmployerBubbleID${i}`,
        payrollDates: [
          addDays(new Date(), i).toISOString().split("T")[0],
          addDays(new Date(), i + 30)
            .toISOString()
            .split("T")[0],
          addDays(new Date(), i + 60)
            .toISOString()
            .split("T")[0],
        ],
      },
    });
  }
}
