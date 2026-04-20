const express = require('express')
const prisma = require('../utils/prisma')
const auth = require('../middleware/auth')

const router = express.Router()

// Get all squads
router.get('/', auth, async (req, res) => {
  try {
    const squads = await prisma.squad.findMany({
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formatted = squads.map(s => ({
      ...s,
      members: s.members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        squadMemberId: m.id,
      }))
    }))

    res.json(formatted)
  } catch (err) {
    console.error('Get squads error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create squad
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, color } = req.body
    if (!name) return res.status(400).json({ error: 'Squad name is required' })

    const squad = await prisma.squad.create({
      data: {
        name, description, color,
        members: { create: { userId: req.userId, role: 'Lead' } }
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    })

    res.status(201).json({
      ...squad,
      members: squad.members.map(m => ({
        id: m.user.id, name: m.user.name, email: m.user.email, role: m.role
      }))
    })
  } catch (err) {
    console.error('Create squad error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete squad
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.squad.delete({ where: { id: req.params.id } })
    res.json({ id: req.params.id })
  } catch (err) {
    console.error('Delete squad error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Add member to squad
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { email, role } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ error: 'User not found with this email' })

    await prisma.squadMember.create({
      data: { squadId: req.params.id, userId: user.id, role: role || 'Member' }
    })

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: role || 'Member' })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Already a member' })
    console.error('Add squad member error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Remove member from squad
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    await prisma.squadMember.deleteMany({
      where: { squadId: req.params.id, userId: req.params.userId }
    })
    res.json({ memberId: req.params.userId })
  } catch (err) {
    console.error('Remove squad member error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update member role
router.put('/:id/members/:userId', auth, async (req, res) => {
  try {
    await prisma.squadMember.updateMany({
      where: { squadId: req.params.id, userId: req.params.userId },
      data: { role: req.body.role }
    })
    res.json({ memberId: req.params.userId, role: req.body.role })
  } catch (err) {
    console.error('Update squad member role error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router