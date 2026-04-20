const express = require('express')
const prisma = require('../utils/prisma')
const auth = require('../middleware/auth')

const router = express.Router()

// Get user notifications
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    res.json(notifications)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

// Mark as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    })
    res.json({ id: req.params.id })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

// Mark all as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, read: false },
      data: { read: true }
    })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.notification.delete({ where: { id: req.params.id } })
    res.json({ id: req.params.id })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

// Clear all
router.delete('/', auth, async (req, res) => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.userId } })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

module.exports = router