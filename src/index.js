require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const projectRoutes = require('./routes/projects')
const taskRoutes = require('./routes/tasks')
const squadRoutes = require('./routes/squads')
const notificationRoutes = require('./routes/notifications')

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    /\.vercel\.app$/,
    /\.onrender\.com$/,
  ],
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/squads', squadRoutes)
app.use('/api/notifications', notificationRoutes)

// Global timelogs route (all logs for current user)
const auth = require('./middleware/auth')
const prisma = require('./utils/prisma')

app.get('/api/timelogs', auth, async (req, res) => {
  try {
    const logs = await prisma.timeLog.findMany({
      where: { loggedById: req.userId },
      include: {
        task: {
          select: {
            id: true, title: true, status: true,
            project: { select: { id: true, name: true, color: true } }
          }
        },
        loggedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(logs)
  } catch (err) {
    console.error('Timelogs error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`🚀 PMS Backend running on http://localhost:${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`)
})