require('dotenv').config();
const prisma = require('../src/config/db');
const bcrypt = require('bcryptjs');
const { signAccessToken } = require('../src/utils/jwt');

async function main() {
  const pw = await bcrypt.hash(process.env.ADMIN_PW || 'AdminPass123!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'admin@test.local' },
    update: { role: 'ADMIN', isActive: true },
    create: {
      fullName: 'Administrator',
      username: 'admin',
      email: 'admin@test.local',
      phone: '0000000000',
      dob: new Date('1990-01-01'),
      gender: 'other',
      country: 'Local',
      state: 'Local',
      city: 'Local',
      businessName: '',
      address: '',
      passwordHash: pw,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const token = signAccessToken({ id: user.id, role: user.role });
  console.log('ADMIN_USER_ID=' + user.id);
  console.log('ADMIN_JWT=' + token);

  // attempt to call admin stats
  try {
    const res = await fetch(process.env.SERVER_URL || 'http://localhost:5000' + '/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const body = await res.text();
    console.log('ADMIN_STATS_STATUS=' + res.status);
    console.log('ADMIN_STATS_BODY=' + body);
  } catch (err) {
    console.error('fetch error', err.message);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
