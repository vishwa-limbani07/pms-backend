const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const password = await bcrypt.hash('password123', 12)

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@pms.com' },
    update: {},
    create: {
      name: 'Vishwa Limbani',
      email: 'demo@pms.com',
      password,
      bio: 'Full-stack developer',
    }
  })

  // Create squad
  const squad = await prisma.squad.create({
    data: {
      name: 'Frontend Squad',
      description: 'React developers',
      color: '#3B82F6',
      members: { create: { userId: user.id, role: 'Lead' } }
    }
  })

  // Create project
  const project = await prisma.project.create({
    data: {
      name: 'Portfolio Website',
      description: 'Personal portfolio redesign',
      color: '#3B82F6',
      squadId: squad.id,
      members: { create: { userId: user.id, role: 'ADMIN' } }
    }
  })

  // Create tasks
  const tasks = [
    { title: 'Setup project structure', status: 'DONE', priority: 'HIGH' },
    { title: 'Design login page', status: 'DONE', priority: 'HIGH' },
    { title: 'Build dashboard layout', status: 'IN_PROGRESS', priority: 'HIGH' },
    { title: 'Implement Kanban board', status: 'IN_PROGRESS', priority: 'MEDIUM' },
    { title: 'API integration', status: 'TODO', priority: 'MEDIUM' },
    { title: 'Write unit tests', status: 'TODO', priority: 'LOW' },
  ]

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        ...task,
        projectId: project.id,
        assigneeId: user.id,
        dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
      }
    })
  }

  console.log('✅ Seed complete!')
  console.log(`   User: demo@pms.com / password123`)
  console.log(`   Project: ${project.name}`)
  console.log(`   Tasks: ${tasks.length} created`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())