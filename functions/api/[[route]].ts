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

app.get('/api/health', (c) => {
  const hasKey = !!c.env.AI_API_KEY
  const hasUrl = !!c.env.AI_API_URL
  const model = c.env.AI_MODEL || 'not set'
  return c.json({
    ok: true,
    time: Date.now(),
    ai: { configured: hasKey && hasUrl, model, urlSet: hasUrl, keySet: hasKey },
  })
})

app.get('/api/test-ai', async (c) => {
  const apiKey = c.env.AI_API_KEY
  const apiUrl = c.env.AI_API_URL
  const apiModel = c.env.AI_MODEL

  if (!apiKey || !apiUrl) {
    return c.json({ error: 'AI API not configured' }, 503)
  }

  try {
    const baseUrl = apiUrl.replace(/\/+$/, '')
    const testUrl = `${baseUrl}/chat/completions`
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: apiModel,
        messages: [{ role: 'user', content: 'Say hello in one word.' }],
        max_tokens: 10,
      }),
    })

    const responseText = await response.text()
    let parsed: any = null
    try { parsed = JSON.parse(responseText) } catch {}

    return c.json({
      status: response.status,
      statusText: response.statusText,
      url: testUrl,
      model: apiModel,
      response: parsed || responseText,
    })
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack?.slice(0, 200) }, 502)
  }
})

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

  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP') || 'unknown'
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const recentReg = await db
    .prepare('SELECT id FROM registration_ips WHERE ip = ? AND registered_at > ?')
    .bind(ip, oneMonthAgo)
    .first()
  if (recentReg) {
    return c.json({ error: '该设备本月已注册过账号，每月限注册一个' }, 429)
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

  await db
    .prepare('INSERT INTO registration_ips (ip) VALUES (?)')
    .bind(ip)
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

  if (!apiKey || !apiUrl) {
    return c.json({ error: '服务端未配置 AI API，请联系管理员' }, 503)
  }

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

    if (!response.ok) {
      const errorText = await response.text()
      return c.json({ error: `AI API 错误: ${errorText}` }, response.status as any)
    }

    await incrementWeekUsage(db, userId)

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

app.post('/api/auth/change-password', async (c) => {
  const userId = await getUserId(c)
  if (!userId) return c.json({ error: '请先登录' }, 401)

  const db = c.env.DB
  const { oldPassword, newPassword } = await c.req.json<{ oldPassword: string; newPassword: string }>()

  if (!oldPassword || !newPassword) {
    return c.json({ error: '请填写所有字段' }, 400)
  }
  if (newPassword.length < 6) {
    return c.json({ error: '新密码至少 6 位' }, 400)
  }

  const user = await db
    .prepare('SELECT password_hash FROM users WHERE id = ?')
    .bind(userId)
    .first<{ password_hash: string }>()
  if (!user) return c.json({ error: '用户不存在' }, 404)

  const oldHash = await hashPassword(oldPassword)
  if (oldHash !== user.password_hash) {
    return c.json({ error: '当前密码错误' }, 401)
  }

  const newHash = await hashPassword(newPassword)
  await db
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(newHash, userId)
    .run()

  return c.json({ ok: true })
})

app.post('/api/auth/delete-account', async (c) => {
  const userId = await getUserId(c)
  if (!userId) return c.json({ error: '请先登录' }, 401)

  const db = c.env.DB
  await db.prepare('DELETE FROM usage_logs WHERE user_id = ?').bind(userId).run()
  await db.prepare('DELETE FROM conversations WHERE user_id = ?').bind(userId).run()
  await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()

  return c.json({ ok: true })
})

app.get('/api/memories', async (c) => {
  const userId = await getUserId(c)
  if (!userId) return c.json({ error: '请先登录' }, 401)

  const db = c.env.DB
  const { results } = await db
    .prepare('SELECT id, content, category, importance, status, created_at, updated_at FROM memories WHERE user_id = ? AND status != ? ORDER BY importance DESC, created_at DESC')
    .bind(userId, 'archived')
    .all<{
      id: string
      content: string
      category: string
      importance: number
      status: string
      created_at: string
      updated_at: string
    }>()

  return c.json({ memories: results || [] })
})

app.post('/api/memories/extract', async (c) => {
  const userId = await getUserId(c)
  if (!userId) return c.json({ error: '请先登录' }, 401)

  const db = c.env.DB
  const { messages } = await c.req.json<{ messages: Array<{ role: string; content: string }> }>()

  if (!messages || messages.length < 2) {
    return c.json({ memories: [] })
  }

  const apiKey = c.env.AI_API_KEY
  const apiUrl = c.env.AI_API_URL
  const apiModel = c.env.AI_MODEL

  if (!apiKey || !apiUrl) {
    return c.json({ memories: [] })
  }

  const conversationText = messages
    .map((m) => `${m.role === 'user' ? 'Student' : 'Emma'}: ${m.content}`)
    .join('\n')

  const extractPrompt = `You are a memory extraction system. Analyze the following English conversation between a student and tutor Emma. Extract ONLY important personal facts about the student that would be useful to remember for future conversations.

Rules:
- Extract facts like: name, age, occupation, hobbies, family, preferences, goals, important events, personality traits
- Do NOT extract: grammar corrections, small talk filler, generic responses
- Each fact should be a concise sentence (under 20 words)
- Assign a category: "personal", "preference", "goal", "event", "trait"
- Assign importance 1-10 (10 = very important like name/occupation, 1 = minor detail)
- Return as JSON array: [{"content": "...", "category": "...", "importance": N}]
- If nothing worth remembering, return empty array []
- Return ONLY the JSON array, no other text

Conversation:
${conversationText}`

  try {
    const baseUrl = apiUrl.replace(/\/+$/, '')
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: apiModel,
        messages: [{ role: 'user', content: extractPrompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      return c.json({ memories: [] })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim() || '[]'

    let extracted: Array<{ content: string; category: string; importance: number }>
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      extracted = []
    }

    if (!Array.isArray(extracted) || extracted.length === 0) {
      return c.json({ memories: [] })
    }

    const saved = []
    for (const mem of extracted) {
      if (!mem.content || !mem.category) continue
      const id = uid()
      const importance = Math.min(10, Math.max(1, mem.importance || 5))
      await db
        .prepare('INSERT INTO memories (id, user_id, content, category, importance) VALUES (?, ?, ?, ?, ?)')
        .bind(id, userId, mem.content, mem.category, importance)
        .run()
      saved.push({ id, content: mem.content, category: mem.category, importance })
    }

    return c.json({ memories: saved })
  } catch {
    return c.json({ memories: [] })
  }
})

app.post('/api/memories/compress', async (c) => {
  const userId = await getUserId(c)
  if (!userId) return c.json({ error: '请先登录' }, 401)

  const db = c.env.DB
  const apiKey = c.env.AI_API_KEY
  const apiUrl = c.env.AI_API_URL
  const apiModel = c.env.AI_MODEL

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString()
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 3600 * 1000).toISOString()

  const weekOldMemories = await db
    .prepare('SELECT id, content, category, importance, created_at FROM memories WHERE user_id = ? AND status = ? AND created_at < ?')
    .bind(userId, 'active', oneWeekAgo)
    .all<{ id: string; content: string; category: string; importance: number; created_at: string }>()

  if (weekOldMemories.results && weekOldMemories.results.length > 0 && apiKey && apiUrl) {
    const memoriesText = weekOldMemories.results.map((m) => `[${m.category}|${m.importance}] ${m.content}`).join('\n')

    const compressPrompt = `You are a memory compression system. Given a list of memories about a person, compress them into fewer, more concise memories. Merge related memories. Remove duplicates. Keep the most important details.

Rules:
- Each compressed memory should be under 15 words
- Keep the category and importance level
- Return as JSON array: [{"content": "...", "category": "...", "importance": N}]
- Return ONLY the JSON array

Memories to compress:
${memoriesText}`

    try {
      const baseUrl = apiUrl.replace(/\/+$/, '')
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: apiModel,
          messages: [{ role: 'user', content: compressPrompt }],
          temperature: 0.2,
          max_tokens: 500,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.choices?.[0]?.message?.content?.trim() || '[]'
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        const compressed = jsonMatch ? JSON.parse(jsonMatch[0]) : []

        for (const old of weekOldMemories.results) {
          await db.prepare('UPDATE memories SET status = ? WHERE id = ?').bind('compressed_source', old.id).run()
        }

        for (const mem of compressed) {
          if (!mem.content) continue
          const id = uid()
          await db
            .prepare('INSERT INTO memories (id, user_id, content, category, importance, status) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id, userId, mem.content, mem.category || 'general', mem.importance || 5, 'active')
            .run()
        }
      }
    } catch {
      // compression failed, keep originals
    }
  }

  const monthOldMemories = await db
    .prepare('SELECT id, content, category, importance FROM memories WHERE user_id = ? AND status = ? AND created_at < ?')
    .bind(userId, 'active', oneMonthAgo)
    .all<{ id: string; content: string; category: string; importance: number }>()

  if (monthOldMemories.results) {
    for (const mem of monthOldMemories.results) {
      const shortContent = mem.content.length > 30 ? mem.content.substring(0, 30) + '...' : mem.content
      await db
        .prepare('UPDATE memories SET content = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .bind(shortContent, 'summarized', mem.id)
        .run()
    }
  }

  const yearOldMemories = await db
    .prepare('SELECT id, content, importance FROM memories WHERE user_id = ? AND status = ? AND created_at < ? AND importance < ?')
    .bind(userId, 'summarized', oneYearAgo, 8)
    .all<{ id: string; content: string; importance: number }>()

  if (yearOldMemories.results) {
    for (const mem of yearOldMemories.results) {
      await db
        .prepare('UPDATE memories SET status = ? WHERE id = ?')
        .bind('archived', mem.id)
        .run()
    }
  }

  return c.json({ ok: true })
})

app.get('/api/test', (c) => c.text('hono works'))

export const onRequest = handle(app)