import { PrismaClient } from "@prisma/client";

/*
 * "Test Consumer1" is an employee of "Test Employer 1"
 * "Test Consumer2" is an employee of "Test Employer 2"
 * "Test Consumer3" is an employee of "Test Employer 1" AND "Test Employer 2"
 * Other test consumers are not employees and Test Employer 3 has no employees
 */

export async function seedEmployees(prisma: PrismaClient) {
  // "Test Consumer1" is an employee of "Test Employer 1"
  const testConsumer1 = await prisma.consumer.findFirst({ where: { email: "testconsumer1@noba.com" } });
  const testEmployer1 = await prisma.employer.findFirst({ where: { referralID: `TestEmployerReferralID1` } });
  if (!testConsumer1 || !testEmployer1) {
    throw new Error("Test consumer or employer not found");
  }

  await prisma.employee.upsert({
    where: { consumerID_employerID: { consumerID: testConsumer1.id, employerID: testEmployer1.id } },
    update: {},
    create: {
      consumerID: testConsumer1.id,
      employerID: testEmployer1.id,
      allocationAmount: 50000,
      allocationCurrency: "COP",
      status: "LINKED",
    },
  });

  // "Test Consumer2" is an employee of "Test Employer 2"
  const testConsumer2 = await prisma.consumer.findFirst({ where: { email: "testconsumer2@noba.com" } });
  const testEmployer2 = await prisma.employer.findFirst({ where: { referralID: `TestEmployerReferralID2` } });
  if (!testConsumer2 || !testEmployer2) {
    throw new Error("Test consumer or employer not found");
  }

  await prisma.employee.upsert({
    where: { consumerID_employerID: { consumerID: testConsumer2.id, employerID: testEmployer2.id } },
    update: {},
    create: {
      consumerID: testConsumer2.id,
      employerID: testEmployer2.id,
      allocationAmount: 25000,
      allocationCurrency: "COP",
      status: "LINKED",
    },
  });

  // "Test Consumer3" is an employee of "Test Employer 1" AND "Test Employer 2"
  const testConsumer3 = await prisma.consumer.findFirst({ where: { email: "testconsumer3@noba.com" } });
  if (!testConsumer3 || !testEmployer1) {
    throw new Error("Test consumer or employer not found");
  }
  await prisma.employee.upsert({
    where: { consumerID_employerID: { consumerID: testConsumer3.id, employerID: testEmployer1.id } },
    update: {},
    create: {
      consumerID: testConsumer3.id,
      employerID: testEmployer1.id,
      allocationAmount: 100000,
      allocationCurrency: "COP",
      status: "LINKED",
    },
  });

  await prisma.employee.upsert({
    where: { consumerID_employerID: { consumerID: testConsumer3.id, employerID: testEmployer2.id } },
    update: {},
    create: {
      consumerID: testConsumer3.id,
      employerID: testEmployer2.id,
      allocationAmount: 200000,
      allocationCurrency: "COP",
      status: "LINKED",
    },
  });
}
