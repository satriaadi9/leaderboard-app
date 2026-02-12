import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SUPERADMIN_EMAIL || 'admin@uc.ac.id';
  const adminPassword = process.env.SUPERADMIN_PASSWORD || 'admin123';
  
  const password = await hash(adminPassword, 12);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password,
      role: UserRole.SUPERADMIN,
    },
    create: {
      email: adminEmail,
      name: 'Super Admin',
      password,
      role: UserRole.SUPERADMIN,
    },
  });

  console.log({ superAdmin });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
