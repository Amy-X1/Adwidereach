const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@business.com' } });
  if (!user) {
    console.log('NO ADMIN FOUND IN DATABASE');
    return;
  }

  console.log('Admin found:', {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    hashPrefix: user.passwordHash.substring(0, 10),
  });

  const match = await bcrypt.compare('Admin@12345', user.passwordHash);
  console.log('Password "Admin@12345" matches:', match);

  if (!match) {
    console.log('\nResetting password to Admin@12345 ...');
    const newHash = await bcrypt.hash('Admin@12345', 12);
    await prisma.user.update({
      where: { email: 'admin@business.com' },
      data: { passwordHash: newHash },
    });
    console.log('Password reset done!');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
