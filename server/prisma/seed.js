require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@business.com';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
    await prisma.user.create({
      data: {
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
      },
    });
    console.log(`✔ Admin user created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log('ℹ Admin user already exists, skipping.');
  }

  // A couple of demo regular users for the admin dashboard to show data
  const demoUsers = [
    {
      fullName: 'Jane Doe',
      username: 'janedoe',
      email: 'jane@example.com',
      phone: '+15551234567',
      dob: new Date('1995-05-12'),
      gender: 'Female',
      country: 'United States',
      state: 'New York',
      city: 'New York City',
      businessName: null,
      address: '456 Demo Ave',
    },
    {
      fullName: 'John Smith',
      username: 'johnsmith',
      email: 'john@example.com',
      phone: '+15559876543',
      dob: new Date('1988-11-02'),
      gender: 'Male',
      country: 'United Kingdom',
      state: 'England',
      city: 'London',
      businessName: 'Smith Consulting',
      address: '789 Sample Rd',
    },
  ];

  for (const u of demoUsers) {
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (!exists) {
      const passwordHash = await bcrypt.hash('Demo@12345', saltRounds);
      await prisma.user.create({ data: { ...u, passwordHash } });
      console.log(`✔ Demo user created: ${u.email}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
