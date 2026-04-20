const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../utils/prisma')
const auth = require('../middleware/auth')

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, bio: true, timezone: true, language: true }
    })

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    })

    res.status(201).json({ user, token })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    })

    const { password: _, ...userWithoutPassword } = user

    res.json({ user: userWithoutPassword, token })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, bio: true, timezone: true, language: true }
    })

    if (!user) return res.status(404).json({ error: 'User not found' })

    res.json(user)
  } catch (err) {
    console.error('Get me error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, bio, timezone, language } = req.body

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name, email, bio, timezone, language },
      select: { id: true, name: true, email: true, bio: true, timezone: true, language: true }
    })

    res.json(user)
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Change password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } })
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' })
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashed }
    })

    res.json({ message: 'Password updated' })
  } catch (err) {
    console.error('Password change error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete account
router.delete('/account', auth, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.userId } })
    res.json({ message: 'Account deleted' })
  } catch (err) {
    console.error('Delete account error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router