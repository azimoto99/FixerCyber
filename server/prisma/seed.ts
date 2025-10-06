import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const testUser = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      email: 'test@fixer.gg',
      passwordHash: hashedPassword
    }
  })

  console.log('✅ Created test user:', testUser.username)

  // Create test player
  const testPlayer = await prisma.player.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      username: 'TestFixer',
      positionX: 0,
      positionY: 0,
      health: 100,
      credits: 1000,
      isAlive: true
    }
  })

  console.log('✅ Created test player:', testPlayer.username)

  // Create AI fixers
  const fixers = [
    {
      name: 'Raven',
      faction: 'Night Syndicate',
      reputation: 85
    },
    {
      name: 'Ghost',
      faction: 'Data Pirates',
      reputation: 92
    },
    {
      name: 'Steel',
      faction: 'Corporate Security',
      reputation: 78
    },
    {
      name: 'Neon',
      faction: 'Underground Network',
      reputation: 88
    }
  ]

  for (const fixerData of fixers) {
    await prisma.fixer.upsert({
      where: { name: fixerData.name },
      update: {},
      create: fixerData
    })
  }

  console.log('✅ Created AI fixers')

  // Create sample contracts
  const contracts = [
    {
      type: 'assassination',
      fixerId: (await prisma.fixer.findFirst({ where: { name: 'Raven' } }))!.id,
      targetData: {
        targetName: 'Corporate Executive',
        location: { x: 100, y: 200 },
        difficulty: 'hard'
      },
      rewardCredits: 5000,
      timeLimit: 30,
      description: 'Eliminate the target without being detected. High security area.'
    },
    {
      type: 'data_extraction',
      fixerId: (await prisma.fixer.findFirst({ where: { name: 'Ghost' } }))!.id,
      targetData: {
        targetSystem: 'Corporate Database',
        location: { x: -150, y: 300 },
        difficulty: 'medium'
      },
      rewardCredits: 3000,
      timeLimit: 45,
      description: 'Extract sensitive data from the corporate database.'
    },
    {
      type: 'sabotage',
      fixerId: (await prisma.fixer.findFirst({ where: { name: 'Steel' } }))!.id,
      targetData: {
        targetFacility: 'Security Station',
        location: { x: 200, y: -100 },
        difficulty: 'easy'
      },
      rewardCredits: 2000,
      timeLimit: 60,
      description: 'Disable the security systems at the target facility.'
    }
  ]

  for (const contractData of contracts) {
    await prisma.contract.create({
      data: contractData
    })
  }

  console.log('✅ Created sample contracts')

  // Create sample augmentations
  const augmentations = [
    {
      name: 'Thermoptic Camo',
      category: 'STEALTH',
      effects: {
        invisibility: true,
        duration: 30,
        cooldown: 120
      },
      powerCost: 15,
      rarity: 'RARE',
      description: 'Temporary invisibility for stealth operations.'
    },
    {
      name: 'Targeting System',
      category: 'COMBAT',
      effects: {
        accuracy: 25,
        range: 50,
        autoTarget: true
      },
      powerCost: 10,
      rarity: 'UNCOMMON',
      description: 'Enhanced targeting capabilities for improved accuracy.'
    },
    {
      name: 'Neural Interface',
      category: 'HACKING',
      effects: {
        hackSpeed: 50,
        bypassChance: 30,
        detectionReduction: 40
      },
      powerCost: 20,
      rarity: 'EPIC',
      description: 'Direct neural connection for faster hacking.'
    },
    {
      name: 'Reinforced Skeleton',
      category: 'UTILITY',
      effects: {
        health: 50,
        damageReduction: 25,
        fallDamage: 0
      },
      powerCost: 5,
      rarity: 'COMMON',
      description: 'Enhanced durability and protection.'
    }
  ]

  for (const augData of augmentations) {
    await prisma.augmentation.create({
      data: augData
    })
  }

  console.log('✅ Created sample augmentations')

  // Create sample housing
  const housing = [
    {
      type: 'SLUM_APARTMENT',
      district: 'Underground',
      positionX: -200,
      positionY: -200,
      rentCost: 500
    },
    {
      type: 'RESIDENTIAL',
      district: 'Residential',
      positionX: 100,
      positionY: 100,
      rentCost: 1500
    },
    {
      type: 'CORPORATE_SUITE',
      district: 'Corporate',
      positionX: 300,
      positionY: 300,
      rentCost: 5000
    }
  ]

  for (const housingData of housing) {
    await prisma.housing.create({
      data: housingData
    })
  }

  console.log('✅ Created sample housing')

  // Create initial world chunks
  const initialChunks = [
    { x: 0, y: 0, districtType: 'corporate' },
    { x: 1, y: 0, districtType: 'corporate' },
    { x: 0, y: 1, districtType: 'residential' },
    { x: 1, y: 1, districtType: 'residential' },
    { x: -1, y: 0, districtType: 'industrial' },
    { x: 0, y: -1, districtType: 'underground' }
  ]

  for (const chunkData of initialChunks) {
    await prisma.worldChunk.create({
      data: {
        ...chunkData,
        generatedData: {
          buildings: [],
          roads: [],
          npcs: [],
          generatedAt: new Date().toISOString()
        }
      }
    })
  }

  console.log('✅ Created initial world chunks')

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



