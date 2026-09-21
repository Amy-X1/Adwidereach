require('dotenv').config();
const prisma = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@business.com';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

  // Try find by email or username
  let user = await prisma.user.findFirst({ where: { OR: [{ email: adminEmail }, { username: adminUsername }] } });

  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash, role: 'ADMIN', isActive: true, email: adminEmail, username: adminUsername } });
    console.log(`Updated existing admin (id=${user.id}). Email set to ${adminEmail}`);
  } else {
    const created = await prisma.user.create({ data: {
      fullName: 'System Administrator',
      username: adminUsername,
      email: adminEmail,
      phone: '+10000000000',
      dob: new Date('1990-01-01'),
      gender: 'Other',
      country: 'United States',
      state: 'California',
      city: 'San Francisco',
      businessName: 'Business Inc.',
      address: '123 Admin Street',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    }});
    console.log(`Created admin user: ${created.email} / ${adminPassword}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
