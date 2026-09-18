require('dotenv').config();
const prisma = require('../src/config/db');

async function main() {
  const servicesData = [
    {
      platform: 'Web',
      name: 'Website Setup',
      description: 'Professional website setup and hosting',
      packages: [
        { name: 'Basic', price: 50.0, deliveryDays: 3, details: 'Basic website with up to 3 pages' },
        { name: 'Pro', price: 150.0, deliveryDays: 7, details: 'Full website with CMS and 10 pages' },
      ],
    },
    {
      platform: 'Social',
      name: 'Social Media Management',
      description: 'Manage social presence and content',
      packages: [
        { name: 'Starter', price: 100.0, deliveryDays: 30, details: 'Monthly posts and analytics' },
        { name: 'Growth', price: 300.0, deliveryDays: 30, details: 'Daily posts and engagement' },
      ],
    },
  ];

  for (const s of servicesData) {
    const exists = await prisma.service.findFirst({ where: { name: s.name, platform: s.platform } });
    if (exists) {
      console.log('Service exists, skipping:', s.name);
      continue;
    }
    const created = await prisma.service.create({ data: { platform: s.platform, name: s.name, description: s.description, packages: { create: s.packages } } });
    console.log('Created service', created.id, created.name);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
