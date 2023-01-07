import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const justin = await prisma.admin.upsert({
    where: { email: "justin@noba.com" },
    update: {},
    create: {
      email: "justin@noba.com",
      name: "Justin Ashworth",
      role: "ADMIN",
    },
  });
  const gal = await prisma.admin.upsert({
    where: { email: "gal@noba.com" },
    update: {},
    create: {
      email: "gal@noba.com",
      name: "Gal Ben-Chanoch",
      role: "ADMIN",
    },
  });
  const subham = await prisma.admin.upsert({
    where: { email: "subham@noba.com" },
    update: {},
    create: {
      email: "subham@noba.com",
      name: "Subham Agarwal",
      role: "ADMIN",
    },
  });
  const soham = await prisma.admin.upsert({
    where: { email: "soham@noba.com" },
    update: {},
    create: {
      email: "soham@noba.com",
      name: "Soham Mukherjee",
      role: "ADMIN",
    },
  });
  const jonathan = await prisma.admin.upsert({
    where: { email: "jonathan@noba.com" },
    update: {},
    create: {
      email: "jonathan@noba.com",
      name: "Jonathan Wu",
      role: "ADMIN",
    },
  });
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
