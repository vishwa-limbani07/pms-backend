const express = require('express')
const prisma = require('../utils/prisma')
const auth = require('../middleware/auth')

const router = express.Router()

// Get all projects for current user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId: req.userId } }
      },
      include: {
        _count: { select: { tasks: true, members: true } },
        squad: { select: { id: true, name: true, color: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formatted = projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      squadId: p.squadId,
      squad: p.squad,
      taskCount: p._count.tasks,
      memberCount: p._count.members,
      createdAt: p.createdAt,
    }))

    res.json(formatted)
  } catch (err) {
    console.error('Get projects error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, color, squadId } = req.body

    if (!name) return res.status(400).json({ error: 'Project name is required' })

    const project = await prisma.project.create({
      data: {
        name,
        description,
        color: color || '#3B82F6',
        squadId: squadId || null,
        members: {
          create: { userId: req.userId, role: 'ADMIN' }
        }
      },
      include: {
        _count: { select: { tasks: true, members: true } },
        squad: { select: { id: true, name: true, color: true } }
      }
    })

    res.status(201).json({
      ...project,
      taskCount: project._count.tasks,
      memberCount: project._count.members,
    })
  } catch (err) {
    console.error('Create project error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { tasks: true, members: true } },
        squad: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } }
      }
    })

    if (!project) return res.status(404).json({ error: 'Project not found' })

    res.json(project)
  } catch (err) {
    console.error('Get project error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, color, squadId } = req.body

    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { name, description, color, squadId },
    })

    res.json(project)
  } catch (err) {
    console.error('Update project error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } })
    res.json({ id: req.params.id })
  } catch (err) {
    console.error('Delete project error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router