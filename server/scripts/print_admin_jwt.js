require('dotenv').config();
const prisma = require('../src/config/db');
const { signAccessToken } = require('../src/utils/jwt');

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@business.com';
  const user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!user) {
    console.error('Admin user not found for', adminEmail);
    process.exit(1);
  }
  const token = signAccessToken({ id: user.id, role: user.role });
  console.log('ADMIN_EMAIL=' + adminEmail);
  console.log('ADMIN_ID=' + user.id);
  console.log('ADMIN_JWT=' + token);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
