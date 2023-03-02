import { PrismaClient } from "@prisma/client";

export async function seedConsumers(prisma: PrismaClient) {
  for (let i = 1; i <= 5; i++) {
    await prisma.consumer.upsert({
      where: { email: `testconsumer${i}@noba.com` },
      update: {},
      create: {
        firstName: "Test",
        lastName: `Consumer${i}`,
        email: `testconsumer${i}@noba.com`,
        displayEmail: `testconsumer${i}@noba.com`,
        handle: `test-consumer${i}`,
        referralCode: `test-consumer${i}ReferralCode`,
        phone: `+57300000000${i}`,
        dateOfBirth: `1990-01-0${i}`,
        address: {
          create: {
            countryCode: "CO",
          },
        },
        verificationData: {
          create: {
            provider: "SARDINE",
            kycCheckStatus: "APPROVED",
            documentVerificationStatus: "NOT_REQUIRED",
            kycVerificationTimestamp: new Date(),
          },
        },
      },
    });
  }
}
