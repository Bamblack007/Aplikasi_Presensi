import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await db.user.upsert({
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

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 10)
  const user = await db.user.upsert({
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

  // Create default office location (Jakarta, example)
  const officeLocation = await db.officeLocation.upsert({
    where: { id: 'default-office' },
    update: {},
    create: {
      id: 'default-office',
      name: 'Kantor Pusat',
      latitude: -6.2088,  // Jakarta latitude
      longitude: 106.8456, // Jakarta longitude
      radius: 100, // 100 meters
      isActive: true,
    },
  })

  console.log('Database seeded successfully!')
  console.log('Admin credentials: username: admin, password: admin123')
  console.log('User credentials: username: user, password: user123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })