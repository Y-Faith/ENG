export type CallStatus = 'idle' | 'dialing' | 'connected' | 'ended'

export type Accent = 'american' | 'british' | 'australian'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type Scene = 'daily' | 'business' | 'travel'

export type SpeakingState = 'user-speaking' | 'ai-speaking' | 'listening' | 'idle' | 'encouraging'

export type ListeningState = 'inactive' | 'listening' | 'paused-encouraging' | 'processing'

export type ApiPlatform =
  | 'deepseek'
  | 'openai'
  | 'anthropic'
  | 'qwen'
  | 'zhipu'
  | 'moonshot'
  | 'baichuan'
  | 'yi'
  | 'doubao'
  | 'custom'

export interface APIConfig {
  id: string
  name: string
  platform: ApiPlatform
  apiKey: string
  apiUrl: string
  apiModel: string
}

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
  listeningModeEnabled: boolean
  lastScene: Scene
  apis: APIConfig[]
  activeApiId: string | null
}

export interface ConversationRecord {
  id: string
  date: string
  scene: Scene
  duration: number
  messages: Message[]
}

export const API_PLATFORM_LABELS: Record<ApiPlatform, string> = {
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  qwen: '通义千问',
  zhipu: '智谱GLM',
  moonshot: '月之暗面',
  baichuan: '百川',
  yi: '零一万物',
  doubao: '字节豆包',
  custom: '自定义',
}

export const API_PLATFORM_DEFAULTS: Record<ApiPlatform, { url: string; model: string }> = {
  deepseek: { url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  openai: { url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  anthropic: { url: 'https://api.anthropic.com/v1', model: 'claude-3-haiku-20240307' },
  qwen: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  zhipu: { url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  moonshot: { url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  baichuan: { url: 'https://api.baichuan-ai.com/v1', model: 'Baichuan4' },
  yi: { url: 'https://api.lingyiwanwu.com/v1', model: 'yi-lightning' },
  doubao: { url: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro-32k' },
  custom: { url: 'https://api.example.com/v1', model: '' },
}

export const DEFAULT_SETTINGS: UserSettings = {
  accent: 'american',
  difficulty: 'intermediate',
  speed: 1.0,
  correctionEnabled: true,
  listeningModeEnabled: false,
  lastScene: 'daily',
  apis: [],
  activeApiId: null,
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

export const SCENE_ICONS: Record<Scene, string> = {
  daily: '💬',
  business: '💼',
  travel: '✈️',
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