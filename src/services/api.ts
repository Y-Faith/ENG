const WORKER_URL = import.meta.env.PROD ? '' : '/api'

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

async function apiCall<T>(
  endpoint: string,
  method: string = 'GET',
  body?: object
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${WORKER_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
    throw new Error(error.error || `请求失败 (${response.status})`)
  }

  return response.json()
}

export interface UserInfo {
  id: string
  email: string
  displayName: string
  weekUsage: number
  weekLimit: number
}

export interface Conversation {
  id: string
  scene: string
  difficulty: string
  messages: Array<{ role: string; content: string }>
  started_at: string
  ended_at: string | null
  duration_seconds: number
}

export async function register(
  email: string,
  password: string,
  displayName?: string
): Promise<{ token: string; user: UserInfo }> {
  return apiCall('/api/auth/register', 'POST', { email, password, displayName })
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: UserInfo }> {
  return apiCall('/api/auth/login', 'POST', { email, password })
}

export async function getMe(): Promise<{ user: UserInfo }> {
  return apiCall('/api/auth/me')
}

export async function proxyAI(
  targetUrl: string,
  reqHeaders: Record<string, string>,
  reqBody: object
): Promise<{ choices: Array<{ message: { content: string } }> }> {
  return apiCall('/api/proxy', 'POST', { targetUrl, headers: reqHeaders, reqBody })
}

export interface AIConfig {
  configured: boolean
  apiKey?: string
  apiUrl?: string
  apiModel?: string
}

export async function getAIConfig(): Promise<AIConfig> {
  return apiCall('/api/ai-config')
}

export async function reportUsage(): Promise<{ ok: boolean; weekUsage: number; weekLimit: number }> {
  return apiCall('/api/usage/report', 'POST')
}

export async function getHistory(): Promise<{ conversations: Conversation[] }> {
  return apiCall('/api/history')
}

export async function saveHistory(params: {
  scene: string
  difficulty: string
  messages: Array<{ role: string; content: string }>
  durationSeconds?: number
}): Promise<{ id: string }> {
  return apiCall('/api/history', 'POST', params)
}

export async function getUsage(): Promise<{ weekUsage: number; weekLimit: number }> {
  return apiCall('/api/usage')
}

export function saveToken(token: string): void {
  localStorage.setItem('auth_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('auth_token')
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  return apiCall('/api/auth/change-password', 'POST', { oldPassword, newPassword })
}

export async function deleteAccount(): Promise<{ ok: boolean }> {
  return apiCall('/api/auth/delete-account', 'POST')
}

export interface Memory {
  id: string
  content: string
  category: string
  importance: number
  status: string
  created_at: string
  updated_at: string
}

export async function getMemories(): Promise<{ memories: Memory[] }> {
  return apiCall('/api/memories')
}

export async function extractMemories(messages: Array<{ role: string; content: string }>): Promise<{ memories: Memory[] }> {
  return apiCall('/api/memories/extract', 'POST', { messages })
}

export async function compressMemories(): Promise<{ ok: boolean }> {
  return apiCall('/api/memories/compress', 'POST')
}