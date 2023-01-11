import { PrismaClient } from "@prisma/client";

export async function seedAdmins(prisma: PrismaClient) {
  await prisma.admin.upsert({
    where: { email: "justin@noba.com" },
    update: {},
    create: {
      email: "justin@noba.com",
      name: `Justin Ashworth`,
      role: "ADMIN",
    },
  });

  await prisma.admin.upsert({
    where: { email: "gal@noba.com" },
    update: {},
    create: {
      email: "gal@noba.com",
      name: "Gal Ben-Chanoch",
      role: "ADMIN",
    },
  });

  await prisma.admin.upsert({
    where: { email: "subham@noba.com" },
    update: {},
    create: {
      email: "subham@noba.com",
      name: "Subham Agarwal",
      role: "ADMIN",
    },
  });

  await prisma.admin.upsert({
    where: { email: "soham@noba.com" },
    update: {},
    create: {
      email: "soham@noba.com",
      name: "Soham Mukherjee",
      role: "ADMIN",
    },
  });

  await prisma.admin.upsert({
    where: { email: "jonathan@noba.com" },
    update: {},
    create: {
      email: "jonathan@noba.com",
      name: "Jonathan Wu",
      role: "ADMIN",
    },
  });
}
