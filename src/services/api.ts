const WORKER_URL = import.meta.env.PROD
  ? 'https://call-english-worker.YOUR_SUBDOMAIN.workers.dev'
  : '/api'

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
  dailyUsage: number
  dailyLimit: number
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
  return apiCall('/auth/register', 'POST', { email, password, displayName })
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: UserInfo }> {
  return apiCall('/auth/login', 'POST', { email, password })
}

export async function getMe(): Promise<{ user: UserInfo }> {
  return apiCall('/auth/me')
}

export async function proxyAI(
  targetUrl: string,
  reqHeaders: Record<string, string>,
  reqBody: object
): Promise<{ choices: Array<{ message: { content: string } }> }> {
  return apiCall('/proxy', 'POST', { targetUrl, headers: reqHeaders, reqBody })
}

export async function getHistory(): Promise<{ conversations: Conversation[] }> {
  return apiCall('/history')
}

export async function saveHistory(params: {
  scene: string
  difficulty: string
  messages: Array<{ role: string; content: string }>
  durationSeconds?: number
}): Promise<{ id: string }> {
  return apiCall('/history', 'POST', params)
}

export async function getUsage(): Promise<{ dailyUsage: number; dailyLimit: number }> {
  return apiCall('/usage')
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