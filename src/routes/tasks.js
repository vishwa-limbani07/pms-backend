const express = require('express')
const prisma = require('../utils/prisma')
const auth = require('../middleware/auth')

const router = express.Router()

// Get tasks for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.projectId },
      include: {
        assignee: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(tasks)
  } catch (err) {
    console.error('Get tasks error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Create task
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, projectId, assigneeId, parentId, estimate } = req.body

    if (!title || !projectId) {
      return res.status(400).json({ error: 'Title and projectId are required' })
    }

    const task = await prisma.task.create({
      data: {
        title, description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        estimate: estimate || null,
        projectId,
        assigneeId: assigneeId || null,
        parentId: parentId || null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } }
      }
    })

    res.status(201).json(task)
  } catch (err) {
    console.error('Create task error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, assigneeId, parentId, estimate } = req.body

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        title, description, status, priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimate, assigneeId, parentId,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } }
      }
    })

    res.json(task)
  } catch (err) {
    console.error('Update task error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Update task status (for Kanban drag)
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        assignee: { select: { id: true, name: true, email: true } }
      }
    })

    res.json(task)
  } catch (err) {
    console.error('Update status error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } })
    res.json({ id: req.params.id })
  } catch (err) {
    console.error('Delete task error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Task Detail routes ────────────────────────────────

// Comments
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: req.params.id },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' }
    })
    res.json(comments)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const comment = await prisma.comment.create({
      data: { text: req.body.text, taskId: req.params.id, authorId: req.userId },
      include: { author: { select: { id: true, name: true, email: true } } }
    })
    res.status(201).json(comment)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.delete('/comments/:id', auth, async (req, res) => {
  try {
    await prisma.comment.delete({ where: { id: req.params.id } })
    res.json({ id: req.params.id })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

// Time logs
router.get('/:id/timelogs', auth, async (req, res) => {
  try {
    const logs = await prisma.timeLog.findMany({
      where: { taskId: req.params.id },
      include: { loggedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(logs)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/:id/timelogs', auth, async (req, res) => {
  try {
    const log = await prisma.timeLog.create({
      data: { duration: req.body.duration, note: req.body.note,        date: req.body.date ? new Date(req.body.date) : new Date(),
 taskId: req.params.id, loggedById: req.userId },
      include: { loggedBy: { select: { id: true, name: true, email: true } } }
    })
    res.status(201).json(log)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.delete('/timelogs/:id', auth, async (req, res) => {
  try {
    await prisma.timeLog.delete({ where: { id: req.params.id } })
    res.json({ id: req.params.id })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

// Linked items
router.get('/:id/linked', auth, async (req, res) => {
  try {
    const links = await prisma.linkedItem.findMany({
      where: { taskId: req.params.id },
      include: { linkedTask: { select: { id: true, title: true, status: true } } }
    })
    res.json(links)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/:id/linked', auth, async (req, res) => {
  try {
    const link = await prisma.linkedItem.create({
      data: { type: req.body.type, taskId: req.params.id, linkedTaskId: req.body.linkedTaskId },
      include: { linkedTask: { select: { id: true, title: true, status: true } } }
    })
    res.status(201).json(link)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})
// Get ALL time logs for current user (across all tasks)
router.get('/timelogs/all', auth, async (req, res) => {
  try {
    const logs = await prisma.timeLog.findMany({
      where: { loggedById: req.userId },
      include: {
        task: { select: { id: true, title: true, status: true, project: { select: { id: true, name: true, color: true } } } },
        loggedBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(logs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})
router.delete('/linked/:id', auth, async (req, res) => {
  try {
    await prisma.linkedItem.delete({ where: { id: req.params.id } })
    res.json({ id: req.params.id })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

module.exports = router