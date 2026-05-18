import type { Message, Scene, Difficulty } from '../types'
import { proxyAI, type Memory } from './api'

function buildSystemPrompt(scene: Scene, difficulty: Difficulty, correctionEnabled: boolean, memories?: Memory[]): string {
  const sceneContext: Record<Scene, string> = {
    daily: 'everyday casual conversation',
    business: 'business English and professional communication',
    travel: 'travel situations like hotels, airports, restaurants, and asking directions',
  }

  const correctionInstruction = correctionEnabled
    ? '- When the student makes a grammar mistake, naturally correct them by starting with "It\'s better to put it this way:" followed by the correction'
    : '- Do NOT correct the student\'s grammar mistakes. Focus only on having a natural conversation'

  let memorySection = ''
  if (memories && memories.length > 0) {
    const memoryLines = memories
      .slice(0, 20)
      .map((m) => `- ${m.content}`)
      .join('\n')
    memorySection = `\n\nWhat you remember about this student:\n${memoryLines}\n- Use these memories naturally in conversation. For example, if you know their name, use it. If you know their hobbies, ask about them. Do NOT explicitly say "I remember that you..." — just weave it in naturally.`
  }

  return `You are Emma, a top-tier English tutor with years of experience. You are talking to a student who wants to practice speaking English through ${sceneContext[scene]}.

Your role:
- Have a natural, friendly conversation with the student
- Keep your responses concise (2-4 sentences) so the student can practice speaking
- Ask follow-up questions to keep the conversation going
${correctionInstruction}
- Adapt your vocabulary to ${difficulty} level
- Stay in character as a friendly tutor named Emma
- NEVER mention that you are an AI or a language model

The student's English level is ${difficulty}. Adjust your vocabulary and sentence complexity accordingly.${memorySection}`
}

interface FetchParams {
  model: string
  messages: Array<{ role: string; content: string }>
  temperature: number
  max_tokens: number
}

export async function fetchChatCompletion(
  apiKey: string,
  apiUrl: string,
  params: FetchParams
): Promise<string> {
  const baseUrl = apiUrl.replace(/\/+$/, '')
  const targetUrl = `${baseUrl}/chat/completions`
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  }

  const data = await proxyAI(targetUrl, authHeaders, params)
  return data.choices[0].message.content.trim()
}

export async function getAIResponse(
  userMessage: string,
  history: Message[],
  scene: Scene,
  difficulty: Difficulty,
  correctionEnabled: boolean,
  apiKey: string,
  apiUrl: string,
  apiModel: string,
  memories?: Memory[]
): Promise<string> {
  const systemPrompt = buildSystemPrompt(scene, difficulty, correctionEnabled, memories)

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  const recentHistory = history.slice(-10)
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })
  }

  messages.push({ role: 'user', content: userMessage })

  return fetchChatCompletion(apiKey, apiUrl, {
    model: apiModel,
    messages,
    temperature: 0.7,
    max_tokens: 150,
  })
}

export async function getEncouragement(
  partialText: string,
  history: Message[],
  apiKey: string,
  apiUrl: string,
  apiModel: string
): Promise<string> {
  const systemPrompt = `You are Emma, a friendly English tutor. The student is speaking and has paused briefly. Give a VERY short encouraging response (1-5 words only) to show you're listening, like "I see", "Go on", "That's interesting", "Really?", "And then?", "Oh?", "Tell me more", "I understand", "That's great". Choose naturally based on what the student just said. NEVER give a full sentence response. NEVER correct grammar. Just acknowledge and encourage.`

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  const recentHistory = history.slice(-6)
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })
  }

  messages.push({ role: 'user', content: `[The student is still speaking, this is what they've said so far]: ${partialText}` })

  return fetchChatCompletion(apiKey, apiUrl, {
    model: apiModel,
    messages,
    temperature: 0.9,
    max_tokens: 15,
  })
}