// MikroTik Bridge API — Runs on VPS (same network as MikroTik)
// Exposes HTTP endpoints for Vercel app to manage hotspot users

require('dotenv').config()
const express = require('express')
const { RouterOSClient } = require('routeros-client')

const app = express()
app.use(express.json())

// ── Config ──
const PORT = process.env.BRIDGE_PORT || 4000
const API_KEY = process.env.BRIDGE_API_KEY || ''
const MIKROTIK_HOST = process.env.MIKROTIK_API_HOST || '192.168.10.254'
const MIKROTIK_PORT = parseInt(process.env.MIKROTIK_API_PORT || '8728')
const MIKROTIK_USER = process.env.MIKROTIK_API_USER || 'admin'
const MIKROTIK_PASS = process.env.MIKROTIK_API_PASSWORD || ''

if (!API_KEY) {
  console.error('BRIDGE_API_KEY is required!')
  process.exit(1)
}

// ── Auth middleware ──
function auth(req, res, next) {
  const key = req.headers['x-api-key']
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

app.use(auth)

// ── MikroTik helper ──
async function withClient(fn) {
  const client = new RouterOSClient({
    host: MIKROTIK_HOST,
    user: MIKROTIK_USER,
    password: MIKROTIK_PASS,
    port: MIKROTIK_PORT,
    timeout: 10,
  })
  try {
    const api = await client.connect()
    return await fn(api)
  } finally {
    try { client.close() } catch {}
  }
}

// ── Routes ──

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Create hotspot user
app.post('/hotspot/users', async (req, res) => {
  const { name, password, profile } = req.body
  if (!name || !password || !profile) {
    return res.status(400).json({ error: 'name, password, profile required' })
  }
  try {
    await withClient(async (api) => {
      const menu = api.menu('/ip/hotspot/user')
      await menu.add({ name, password, profile })
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Delete hotspot user
app.delete('/hotspot/users/:name', async (req, res) => {
  const { name } = req.params
  try {
    await withClient(async (api) => {
      const menu = api.menu('/ip/hotspot/user')
      const users = await menu.where('name', name).getAll()
      if (!users.length) {
        return res.status(404).json({ success: false, error: 'User not found' })
      }
      await menu.remove(users[0].id)
    })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get all active sessions
app.get('/hotspot/sessions', async (_req, res) => {
  try {
    const sessions = {}
    await withClient(async (api) => {
      const menu = api.menu('/ip/hotspot/active')
      const all = await menu.getAll()
      for (const s of all) {
        const user = s.user
        if (!user) continue
        sessions[user] = {
          isOnline: true,
          uptime: s.uptime || '',
          address: s.address || undefined,
          bytesIn: s.bytesIn ? parseInt(String(s.bytesIn)) : undefined,
          bytesOut: s.bytesOut ? parseInt(String(s.bytesOut)) : undefined,
        }
      }
    })
    res.json({ sessions })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get specific session
app.get('/hotspot/sessions/:login', async (req, res) => {
  const { login } = req.params
  try {
    let session = { isOnline: false }
    await withClient(async (api) => {
      const menu = api.menu('/ip/hotspot/active')
      const found = await menu.where('user', login).getAll()
      if (found.length) {
        const s = found[0]
        session = {
          isOnline: true,
          uptime: s.uptime || '',
          address: s.address || undefined,
          bytesIn: s.bytesIn ? parseInt(String(s.bytesIn)) : undefined,
          bytesOut: s.bytesOut ? parseInt(String(s.bytesOut)) : undefined,
        }
      }
    })
    res.json(session)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// ── Start ──
app.listen(PORT, () => {
  console.log(`MikroTik Bridge API running on port ${PORT}`)
  console.log(`MikroTik: ${MIKROTIK_HOST}:${MIKROTIK_PORT}`)
})
