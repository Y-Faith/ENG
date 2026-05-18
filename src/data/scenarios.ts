import type { Scene, Difficulty, Message } from '../types'
import { fetchChatCompletion, getAIResponse, getEncouragement } from '../services/openai'

const sceneGreetingPrompts: Record<Scene, string> = {
  daily: 'Greet the student warmly and ask how they are doing. Keep it to 1-2 sentences.',
  business: 'Greet the student professionally and ask what business topic they would like to practice today. Keep it to 1-2 sentences.',
  travel: 'Greet the student and ask where they would like to travel or what travel scenario they want to practice. Keep it to 1-2 sentences.',
}

const MINIMAL_FALLBACKS = [
  "I see. Could you tell me more?",
  "That's interesting. Go on.",
  "Really? What happened next?",
  "I understand. Please continue.",
]

const MINIMAL_ENCOURAGEMENTS = [
  "I see",
  "Go on",
  "Mm-hmm",
  "Really?",
  "Tell me more",
]

export function getGreeting(scene: Scene): string {
  return MINIMAL_FALLBACKS[Math.floor(Math.random() * MINIMAL_FALLBACKS.length)]
}

export function getGreetingPrompt(scene: Scene): string {
  return sceneGreetingPrompts[scene]
}

export function getCorrection(text: string, difficulty: Difficulty): string | null {
  const patterns: Record<Difficulty, [RegExp, string][]> = {
    beginner: [
      [/me go (.*)/i, 'Try: "I go $1" or "I went $1"'],
      [/he go (.*)/i, 'Try: "He goes $1" or "He went $1"'],
      [/she go (.*)/i, 'Try: "She goes $1" or "She went $1"'],
      [/yesterday (.*) go/i, 'Tip: For past events, use "went" instead of "go"'],
      [/no have/i, 'Try: "don\'t have" or "doesn\'t have"'],
      [/more good/i, 'Try: "better" instead of "more good"'],
      [/more bad/i, 'Try: "worse" instead of "more bad"'],
    ],
    intermediate: [
      [/if I was/i, 'Tip: In formal English, use "If I were" for hypothetical situations'],
      [/I have went/i, 'Try: "I have gone" (present perfect)'],
      [/less (.*) than me/i, 'Tip: Use "fewer" for countable nouns, "less" for uncountable'],
      [/between you and I/i, 'Try: "between you and me" (object pronoun)'],
    ],
    advanced: [
      [/whom (.*) I think/i, 'Tip: Consider if "who" would be more natural here'],
      [/irregardless/i, 'Tip: "Regardless" is the standard form'],
    ],
  }

  for (const [regex, message] of patterns[difficulty]) {
    if (regex.test(text)) {
      return message
    }
  }
  return null
}

export async function generateAIResponse(
  userText: string,
  scene: Scene,
  difficulty: Difficulty,
  history: Message[],
  correctionEnabled: boolean,
  apiKey?: string,
  apiUrl?: string,
  apiModel?: string,
  memories?: import('../services/api').Memory[]
): Promise<{ text: string; usedAI: boolean }> {
  if (apiKey) {
    try {
      const text = await getAIResponse(userText, history, scene, difficulty, correctionEnabled, apiKey, apiUrl || '', apiModel || '', memories)
      return { text, usedAI: true }
    } catch (err) {
      console.error('AI API 调用失败:', err)
    }
  }

  return { text: MINIMAL_FALLBACKS[Math.floor(Math.random() * MINIMAL_FALLBACKS.length)], usedAI: false }
}

export async function generateAIGreeting(
  scene: Scene,
  difficulty: Difficulty,
  apiKey: string,
  apiUrl: string,
  apiModel: string
): Promise<string> {
  try {
    const prompt = getGreetingPrompt(scene)
    const text = await fetchChatCompletion(apiKey, apiUrl, {
      model: apiModel,
      messages: [
        {
          role: 'system',
          content: `You are Emma, a friendly English tutor. The student's level is ${difficulty}. ${prompt} Be natural and warm. NEVER mention you are an AI.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 60,
    })
    return text
  } catch {
    return getGreeting(scene)
  }
}

export async function generateEncouragement(
  partialText: string,
  history: Message[],
  apiKey?: string,
  apiUrl?: string,
  apiModel?: string
): Promise<string> {
  if (apiKey) {
    try {
      const text = await getEncouragement(partialText, history, apiKey, apiUrl || '', apiModel || '')
      return text
    } catch (err) {
      console.error('鼓励回应 API 调用失败:', err)
    }
  }

  return MINIMAL_ENCOURAGEMENTS[Math.floor(Math.random() * MINIMAL_ENCOURAGEMENTS.length)]
}

export async function generateContextualResponse(
  partialText: string,
  history: Message[],
  _scene: Scene,
  apiKey?: string,
  apiUrl?: string,
  apiModel?: string
): Promise<string> {
  if (apiKey) {
    try {
      const systemPrompt = `You are Emma, a warm and empathetic English tutor. The student is sharing something in listening mode. Your role is to be a supportive listener.

Based on what the student just said, respond with appropriate emotion:
- If they seem frustrated: respond with empathy
- If they are sharing good news: respond with genuine happiness
- If they seem excited: match their energy
- If neutral: acknowledge and encourage them to continue

Keep your response VERY brief (1-2 sentences max). Be warm and natural. Do NOT correct grammar.`

      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
      ]

      const recentHistory = history.slice(-4)
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })
      }

      messages.push({ role: 'user', content: partialText })

      const text = await fetchChatCompletion(apiKey, apiUrl!, {
        model: apiModel || '',
        messages,
        temperature: 0.8,
        max_tokens: 50,
      })
      return text
    } catch (err) {
      console.error('Contextual response API failed:', err)
    }
  }

  return MINIMAL_FALLBACKS[Math.floor(Math.random() * MINIMAL_FALLBACKS.length)]
}
