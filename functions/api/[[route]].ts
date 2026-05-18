import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign, verify } from 'hono/jwt'
import { handle } from 'hono/cloudflare-pages'
import type { SignatureAlgorithm } from 'hono/utils/jwt/jwa'

interface Env {
  DB: D1Database
  AI_API_KEY: string
  AI_API_URL: string
  AI_MODEL: string
  WEEKLY_LIMIT: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}))

const JWT_SECRET = 'seu-eng-jwt-secret-2025'
const JWT_ALG: SignatureAlgorithm = 'HS256'
const DEFAULT_WEEKLY_LIMIT = 20

function uid(): string {
  return crypto.randomUUID()
}

function getWeekKey(): string {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  return monday.toISOString().slice(0, 10)
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getUserId(c: any): Promise<string | null> {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const payload = await verify(auth.slice(7), JWT_SECRET, JWT_ALG)
    return payload.sub as string
  } catch {
    return null
  }
}

async function getWeekUsage(db: D1Database, userId: string): Promise<number> {
  const weekKey = getWeekKey()
  const row = await db
    .prepare('SELECT count FROM usage_logs WHERE user_id = ? AND date = ?')
    .bind(userId, weekKey)
    .first<{ count: number }>()
  return row?.count ?? 0
}

async function incrementWeekUsage(db: D1Database, userId: string): Promise<void> {
  const weekKey = getWeekKey()
  const row = await db
    .prepare('SELECT id FROM usage_logs WHERE user_id = ? AND date = ?')
    .bind(userId, weekKey)
    .first<{ id: number }>()

  if (row) {
    await db
      .prepare('UPDATE usage_logs SET count = count + 1 WHERE id = ?')
      .bind(row.id)
      .run()
  } else {
    await db
      .prepare('INSERT INTO usage_logs (user_id, date, count) VALUES (?, ?, 1)')
      .bind(userId, weekKey)
      .run()
  }
}

app.onError((err, c) => {
  return c.json({ error: err.message || '服务器内部错误' }, 500)
})

app.get('/api/health', (c) => c.json({ ok: true, time: Date.now() }))

app.post('/api/auth/register', async (c) => {
  const db = c.env.DB
  const { email, password, displayName } = await c.req.json<{
    email: string
    password: string
    displayName?: string
  }>()

  if (!email || !password) {
    return c.json({ error: '邮箱和密码不能为空' }, 400)
  }
  if (password.length < 6) {
    return c.json({ error: '密码至少 6 位' }, 400)
  }

  const existing = await db
    .prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first()
  if (existing) {
    return c.json({ error: '该邮箱已注册' }, 409)
  }

  const id = uid()
  const hash = await hashPassword(password)
  await db
    .prepare(
      'INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
    )
    .bind(id, email, hash, displayName || email.split('@')[0])
    .run()

  const token = await sign(
    { sub: id, email, exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 },
    JWT_SECRET,
    JWT_ALG
  )

  return c.json({ token, user: { id, email, displayName: displayName || email.split('@')[0] } }, 201)
})

app.post('/api/auth/login', async (c) => {
  const db = c.env.DB
  const { email, password } = await c.req.json<{ email: string; password: string }>()

  if (!email || !password) {
    return c.json({ error: '邮箱和密码不能为空' }, 400)
  }

  const user = await db
    .prepare('SELECT id, email, password_hash, display_name FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string; email: string; password_hash: string; display_name: string }>()

  if (!user) {
    return c.json({ error: '邮箱或密码错误' }, 401)
  }

  const hash = await hashPassword(password)
  if (hash !== user.password_hash) {
    return c.json({ error: '邮箱或密码错误' }, 401)
  }

  const token = await sign(
    { sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 },
    JWT_SECRET,
    JWT_ALG
  )

  const usage = await getWeekUsage(db, user.id)
  const limit = parseInt(c.env.WEEKLY_LIMIT || String(DEFAULT_WEEKLY_LIMIT))

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      weekUsage: usage,
      weekLimit: limit,
    },
  })
})

app.get('/api/auth/me', async (c) => {
  const userId = await getUserId(c)
  if (!userId) return c.json({ error: '未登录' }, 401)

  const db = c.env.DB
  const user = await db
    .prepare('SELECT id, email, display_name FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; email: string; display_name: string }>()

  if (!user) return c.json({ error: '用户不存在' }, 404)

  const usage = await getWeekUsage(db, userId)
  const limit = parseInt(c.env.WEEKLY_LIMIT || String(DEFAULT_WEEKLY_LIMIT))

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      weekUsage: usage,
      weekLimit: limit,
    },
  })
})

app.post('/api/proxy', async (c) => {
  const userId = await getUserId(c)
  if (!userId) return c.json({ error: '请先登录' }, 401)

  const db = c.env.DB
  const weeklyLimit = parseInt(c.env.WEEKLY_LIMIT || String(DEFAULT_WEEKLY_LIMIT))

  const usage = await getWeekUsage(db, userId)
  if (usage >= weeklyLimit) {
    return c.json({ error: `本周用量已用完（${weeklyLimit}次），请下周再试` }, 429)
  }

  const { targetUrl, headers: reqHeaders, reqBody } = await c.req.json<{
    targetUrl: string
    headers: Record<string, string>
    reqBody: object
  }>()

  const apiKey = c.env.AI_API_KEY
  const apiUrl = c.env.AI_API_URL
  const apiModel = c.env.AI_MODEL

  if (apiKey && apiUrl) {
    try {
      const baseUrl = apiUrl.replace(/\/+$/, '')
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...reqBody, model: apiModel || (reqBody as any).model }),
      })

      await incrementWeekUsage(db, userId)

      if (!response.ok) {
        const errorText = await response.text()
        return c.json({ error: errorText }, response.status as any)
      }

      const data = await response.json()
      return c.json(data)
    } catch (e: any) {
      return c.json({ error: e.message || '请求失败' }, 502)
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(reqBody),
    })

    await incrementWeekUsage(db, userId)

    if (!response.ok) {
      const errorText = await response.text()
      return c.json({ error: errorText }, response.status as any)
    }

    const data = await response.json()
    return c.json(data)
  } catch (e: any) {
    return c.json({ error: e.message || '请求失败' }, 502)
  }
})

app.get('/api/history', async (c) => {
  const userId = await getUserId(c)
  if (!userId) return c.json({ error: '请先登录' }, 401)

  const db = c.env.DB
  const { results } = await db
    .prepare(
      'SELECT id, scene, difficulty, messages, started_at, ended_at, duration_seconds FROM conversations WHERE user_id = ? ORDER BY started_at DESC LIMIT 50'
    )
    .bind(userId)
    .all<{
      id: string
      scene: string
      difficulty: string
      messages: string
      started_at: string
      ended_at: string | null
      duration_seconds: number
    }>()

  return c.json({
    conversations: (results || []).map((r) => ({
      ...r,
      messages: JSON.parse(r.messages),
    })),
  })
})

app.post('/api/history', async (c) => {
  const userId = await getUserId(c)
  if (!userId) return c.json({ error: '请先登录' }, 401)

  const db = c.env.DB
  const { scene, difficulty, messages, durationSeconds } = await c.req.json<{
    scene: string
    difficulty: string
    messages: object[]
    durationSeconds?: number
  }>()

  const id = uid()
  await db
    .prepare(
      'INSERT INTO conversations (id, user_id, scene, difficulty, messages, ended_at, duration_seconds) VALUES (?, ?, ?, ?, ?, datetime(\'now\'), ?)'
    )
    .bind(id, userId, scene, difficulty, JSON.stringify(messages), durationSeconds || 0)
    .run()

  return c.json({ id }, 201)
})

app.get('/api/usage', async (c) => {
  const userId = await getUserId(c)
  if (!userId) return c.json({ error: '请先登录' }, 401)

  const db = c.env.DB
  const usage = await getWeekUsage(db, userId)
  const limit = parseInt(c.env.WEEKLY_LIMIT || String(DEFAULT_WEEKLY_LIMIT))

  return c.json({ weekUsage: usage, weekLimit: limit })
})

app.get('/api/test', (c) => c.text('hono works'))

export const onRequest = handle(app)