import type { Message, Scene, Difficulty } from '../types'

function buildSystemPrompt(scene: Scene, difficulty: Difficulty): string {
  const sceneContext: Record<Scene, string> = {
    daily: 'everyday casual conversation',
    business: 'business English and professional communication',
    travel: 'travel situations like hotels, airports, restaurants, and asking directions',
  }

  return `You are Emma, a top-tier English tutor with years of experience. You are talking to a student who wants to practice speaking English through ${sceneContext[scene]}.

Your role:
- Have a natural, friendly conversation with the student
- Keep your responses concise (2-4 sentences) so the student can practice speaking
- Ask follow-up questions to keep the conversation going
- When the student makes a grammar mistake, naturally correct them by starting with "It's better to put it this way:" followed by the correction
- Adapt your vocabulary to ${difficulty} level
- Stay in character as a friendly tutor named Emma
- NEVER mention that you are an AI or a language model

The student's English level is ${difficulty}. Adjust your vocabulary and sentence complexity accordingly.`
}

export async function getAIResponse(
  userMessage: string,
  history: Message[],
  scene: Scene,
  difficulty: Difficulty,
  apiKey: string,
  apiUrl: string,
  apiModel: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(scene, difficulty)

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

  const baseUrl = apiUrl.replace(/\/+$/, '')
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: apiModel,
      messages,
      temperature: 0.7,
      max_tokens: 150,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content.trim()
}