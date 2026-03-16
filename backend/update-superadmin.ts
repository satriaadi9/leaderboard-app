import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await hash('admin123', 10);
  
  await prisma.user.update({
    where: { email: 'isb@ciputra.ac.id' },
    data: { password, role: UserRole.SUPERADMIN },
  });
  console.log('Superadmin password updated!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
