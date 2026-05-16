export type CallStatus = 'idle' | 'dialing' | 'connected' | 'ended'

export type Accent = 'american' | 'british' | 'australian'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type Scene = 'daily' | 'business' | 'travel'

export type SpeakingState = 'user-speaking' | 'ai-speaking' | 'listening' | 'idle'

export interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: number
  correction?: string
}

export interface UserSettings {
  accent: Accent
  difficulty: Difficulty
  speed: number
  correctionEnabled: boolean
  lastScene: Scene
  apiKey: string
  apiUrl: string
  apiModel: string
}

export interface ConversationRecord {
  id: string
  date: string
  scene: Scene
  duration: number
  messages: Message[]
}

export const DEFAULT_SETTINGS: UserSettings = {
  accent: 'american',
  difficulty: 'intermediate',
  speed: 1.0,
  correctionEnabled: true,
  lastScene: 'daily',
  apiKey: '',
  apiUrl: 'https://api.deepseek.com/v1',
  apiModel: 'deepseek-chat',
}

export const ACCENT_LABELS: Record<Accent, string> = {
  american: '美式英语',
  british: '英式英语',
  australian: '澳式英语',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
}

export const SCENE_LABELS: Record<Scene, string> = {
  daily: '日常闲聊',
  business: '商务会议',
  travel: '旅行英语',
}

export const AI_NAMES: Record<Accent, string> = {
  american: 'Emma',
  british: 'Oliver',
  australian: 'Sophie',
}

export const AI_TITLES: Record<Accent, string> = {
  american: '美式英语外教',
  british: '英式英语外教',
  australian: '澳式英语外教',
}