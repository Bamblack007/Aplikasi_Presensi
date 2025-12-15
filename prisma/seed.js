const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const db = new PrismaClient()

async function main() {
  console.log('Seeding database (JS)...')

  const adminPassword = await bcrypt.hash('admin123', 10)
  await db.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      name: 'Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  })

  const userPassword = await bcrypt.hash('user123', 10)
  await db.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      password: userPassword,
      name: 'User Pegawai',
      role: 'USER',
      isActive: true,
    },
  })

  await db.officeLocation.upsert({
    where: { id: 'default-office' },
    update: {},
    create: {
      id: 'default-office',
      name: 'Kantor Pusat',
      latitude: -6.2088,
      longitude: 106.8456,
      radius: 100,
      isActive: true,
    },
  })

  console.log('Seeding done')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
