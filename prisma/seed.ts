import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "demo@example.com";
  const passwordHash = await bcrypt.hash("demo12345", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      fullName: "Demo User",
      passwordHash,
      settings: {
        create: {
          rentalRatePerHour: 150,
          instructorRatePerHour: 80,
          currency: "EUR",
        },
      },
    },
  });

  console.log(`Seed OK. Demo user: ${user.email} / password: demo12345`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
