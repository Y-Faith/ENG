import type { Scene, Difficulty, Message } from '../types'
import { fetchDirect, getAIResponse, getEncouragement } from '../services/openai'

interface GreetingSet {
  greetings: string[]
  fallbacks: string[]
}

const sceneGreetings: Record<Scene, GreetingSet> = {
  daily: {
    greetings: [
      "Hi there! How's your day going?",
      "Hello! Nice to talk with you today. What would you like to chat about?",
      "Hey! I'm Emma. How are you feeling today?",
      "Good to hear from you! What's new with you?",
    ],
    fallbacks: [
      "That's interesting! Tell me more about that.",
      "I see. And how does that make you feel?",
      "Oh really? What happened next?",
      "That sounds great! What else is on your mind?",
      "I understand. By the way, what do you like to do in your free time?",
      "Nice! Do you have any hobbies you enjoy?",
      "Speaking of which, have you watched any good movies lately?",
      "That reminds me — what kind of music do you like?",
    ],
  },
  business: {
    greetings: [
      "Good morning! Welcome to our business English practice. Shall we start with introductions?",
      "Hello! Let's practice some business conversation today. What industry do you work in?",
      "Hi there! Ready for our business meeting simulation? What's on the agenda today?",
    ],
    fallbacks: [
      "That's a good point. Could you elaborate on your business strategy?",
      "I see. How does your team handle project deadlines?",
      "Interesting approach. What metrics do you use to measure success?",
      "Let's discuss the quarterly results. How do you think we performed?",
      "What's your opinion on remote work versus office work?",
      "How do you typically prepare for important presentations?",
      "Could you walk me through your decision-making process?",
      "What do you think is the key to successful negotiation?",
    ],
  },
  travel: {
    greetings: [
      "Welcome! Where would you like to travel today? I can help you practice airport, hotel, or restaurant conversations.",
      "Hello traveler! Ready to explore? Where are we going on our virtual trip?",
      "Hi! Let's practice some travel English. Are you checking into a hotel or ordering at a restaurant?",
    ],
    fallbacks: [
      "Great choice! Now, let's imagine you're at the check-in counter. What would you say?",
      "That sounds like a wonderful destination. Have you been there before?",
      "Let's practice ordering food. What would you like to eat?",
      "Now imagine you need to ask for directions. What would you say?",
      "At the hotel now — how would you request extra towels?",
      "You're at the airport and your flight is delayed. What do you ask the staff?",
      "Let's practice booking a tour. What kind of activities interest you?",
      "How would you describe your dietary restrictions at a restaurant?",
    ],
  },
}

const corrections: Record<Difficulty, { patterns: [RegExp, string][] }> = {
  beginner: {
    patterns: [
      [/me go (.*)/i, 'Try: "I go $1" or "I went $1"'],
      [/he go (.*)/i, 'Try: "He goes $1" or "He went $1"'],
      [/she go (.*)/i, 'Try: "She goes $1" or "She went $1"'],
      [/yesterday (.*) go/i, 'Tip: For past events, use "went" instead of "go"'],
      [/no have/i, 'Try: "don\'t have" or "doesn\'t have"'],
      [/more good/i, 'Try: "better" instead of "more good"'],
      [/more bad/i, 'Try: "worse" instead of "more bad"'],
    ],
  },
  intermediate: {
    patterns: [
      [/if I was/i, 'Tip: In formal English, use "If I were" for hypothetical situations'],
      [/I have went/i, 'Try: "I have gone" (present perfect)'],
      [/less (.*) than me/i, 'Tip: Use "fewer" for countable nouns, "less" for uncountable'],
      [/between you and I/i, 'Try: "between you and me" (object pronoun)'],
    ],
  },
  advanced: {
    patterns: [
      [/whom (.*) I think/i, 'Tip: Consider if "who" would be more natural here'],
      [/irregardless/i, 'Tip: "Regardless" is the standard form'],
    ],
  },
}

export function getGreeting(scene: Scene): string {
  const sceneData = sceneGreetings[scene] ?? sceneGreetings.daily
  const greetings = sceneData.greetings
  return greetings[Math.floor(Math.random() * greetings.length)]
}

function getFallbackResponse(scene: Scene): string {
  const sceneData = sceneGreetings[scene] ?? sceneGreetings.daily
  const fallbacks = sceneData.fallbacks
  return fallbacks[Math.floor(Math.random() * fallbacks.length)]
}

export function getCorrection(text: string, difficulty: Difficulty): string | null {
  const patterns = corrections[difficulty].patterns
  for (const [regex, message] of patterns) {
    if (regex.test(text)) {
      return message
    }
  }
  return null
}

function generateLocalResponse(userText: string, scene: Scene, history: Message[]): string {
  const lower = userText.toLowerCase().trim()

  if (lower.length < 5) {
    return getFallbackResponse(scene)
  }

  const lastAiMsg = [...history].reverse().find((m) => m.role === 'ai')
  const contextAware = lastAiMsg ? `Following up on our conversation: ` : ''

  if (scene === 'daily') {
    if (lower.includes('weather')) {
      const responses = [
        "The weather has been lovely lately! Do you prefer sunny or rainy days?",
        "I know, right? I love it when the weather is like this. What's your favorite season?",
        "Speaking of weather, do you enjoy outdoor activities when it's nice out?",
      ]
      return contextAware + responses[Math.floor(Math.random() * responses.length)]
    }
    if (lower.includes('food') || lower.includes('eat')) {
      const responses = [
        "Oh, I love talking about food! What's your favorite cuisine?",
        "That sounds delicious! Do you enjoy cooking, or do you prefer eating out?",
        "Yum! Have you tried any new restaurants recently?",
      ]
      return contextAware + responses[Math.floor(Math.random() * responses.length)]
    }
    if (lower.includes('work') || lower.includes('job')) {
      const responses = [
        "Work can be challenging sometimes. What do you enjoy most about your job?",
        "I see. How do you usually balance work and personal life?",
        "That's interesting! What career goals are you working towards?",
      ]
      return contextAware + responses[Math.floor(Math.random() * responses.length)]
    }
    if (lower.includes('hobby') || lower.includes('hobbies')) {
      const responses = [
        "Hobbies are so important for relaxation! How did you get started with yours?",
        "That's a wonderful hobby! How often do you get to do it?",
        "Nice! Have you ever thought about turning your hobby into something more?",
      ]
      return contextAware + responses[Math.floor(Math.random() * responses.length)]
    }
  }

  if (scene === 'business') {
    if (lower.includes('meeting')) {
      const responses = [
        "Let's talk about meeting etiquette. How do you usually prepare an agenda?",
        "Good point about meetings. How do you ensure they stay productive?",
        "Meetings can be tricky. What's your strategy for handling disagreements?",
      ]
      return contextAware + responses[Math.floor(Math.random() * responses.length)]
    }
    if (lower.includes('deadline') || lower.includes('project')) {
      const responses = [
        "Project management is crucial. What tools do you use to track progress?",
        "Deadlines can be stressful. How do you prioritize when everything is urgent?",
        "That's a common challenge. How does your team communicate during crunch time?",
      ]
      return contextAware + responses[Math.floor(Math.random() * responses.length)]
    }
    if (lower.includes('email')) {
      const responses = [
        "Email communication is key in business. Do you prefer formal or casual tones?",
        "Good topic! How do you handle difficult conversations over email?",
        "Email etiquette varies by culture. Have you noticed any differences?",
      ]
      return contextAware + responses[Math.floor(Math.random() * responses.length)]
    }
  }

  if (scene === 'travel') {
    if (lower.includes('hotel') || lower.includes('check')) {
      const responses = [
        "Great! Let's practice: 'I have a reservation under the name...' Can you complete that?",
        "At the hotel front desk now. How would you ask about the WiFi password?",
        "Good! Now, how would you request a late checkout?",
      ]
      return contextAware + responses[Math.floor(Math.random() * responses.length)]
    }
    if (lower.includes('restaurant') || lower.includes('order') || lower.includes('food')) {
      const responses = [
        "Perfect! Let's practice ordering: 'I'd like to order the...' What would you like?",
        "At a restaurant now. How would you ask for the bill?",
        "Good! How would you tell the waiter about a food allergy?",
      ]
      return contextAware + responses[Math.floor(Math.random() * responses.length)]
    }
    if (lower.includes('airport') || lower.includes('flight')) {
      const responses = [
        "Airport practice! How would you ask: 'Which gate is my flight departing from?'",
        "Good! Now imagine your luggage is lost. What would you say at the counter?",
        "Let's practice: 'Excuse me, where is the baggage claim area?'",
      ]
      return contextAware + responses[Math.floor(Math.random() * responses.length)]
    }
    if (lower.includes('direction') || lower.includes('where')) {
      const responses = [
        "Asking for directions is essential! Try: 'Excuse me, could you tell me how to get to...?'",
        "Good practice! How would you ask: 'Is it within walking distance?'",
        "Nice! Now try: 'Which bus should I take to get to the city center?'",
      ]
      return contextAware + responses[Math.floor(Math.random() * responses.length)]
    }
  }

  return getFallbackResponse(scene)
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
      const text = await getAIResponse(userText, history, scene, difficulty, correctionEnabled, apiKey, apiUrl || 'https://api.deepseek.com/v1', apiModel || 'deepseek-chat', memories)
      return { text, usedAI: true }
    } catch (err) {
      console.error('AI API 调用失败，降级到本地回复:', err)
    }
  }

  return { text: generateLocalResponse(userText, scene, history), usedAI: false }
}

const localEncouragements = [
  "I see",
  "Go on",
  "That's interesting",
  "Really?",
  "And then?",
  "Tell me more",
  "I understand",
  "That's great",
  "Oh?",
  "Mm-hmm",
  "Uh huh",
]

export async function generateEncouragement(
  partialText: string,
  history: Message[],
  apiKey?: string,
  apiUrl?: string,
  apiModel?: string
): Promise<string> {
  if (apiKey) {
    try {
      const text = await getEncouragement(partialText, history, apiKey, apiUrl || 'https://api.deepseek.com/v1', apiModel || 'deepseek-chat')
      return text
    } catch (err) {
      console.error('鼓励回应 API 调用失败，使用本地:', err)
    }
  }

  return localEncouragements[Math.floor(Math.random() * localEncouragements.length)]
}

const contextualResponses = {
  venting: [
    "That sounds really tough. Take your time.",
    "I'm sorry to hear that. It must be frustrating.",
    "That sounds difficult. You're handling it well.",
    "I can see why that would be stressful.",
    "That is indeed challenging. Keep going.",
  ],
  sharing: [
    "That's wonderful news! How exciting!",
    "That sounds amazing! Tell me more!",
    "I'm so happy for you! That's great!",
    "How fantastic! You must be thrilled.",
    "That's really cool! What happened next?",
  ],
  excited: [
    "I can feel your excitement! That's awesome!",
    "Your energy is contagious! Keep going!",
    "You sound really passionate about this!",
    "That's so interesting! Tell me everything!",
    "I love how excited you are!",
  ],
  neutral: [
    "I see. Go on.",
    "Interesting. Tell me more.",
    "Uh huh. What else?",
    "I understand. Continue.",
    "Mm, I hear you. What do you think about that?",
  ],
}

function detectEmotionalContext(text: string): 'venting' | 'sharing' | 'excited' | 'neutral' {
  const lower = text.toLowerCase()

  const ventingIndicators = ['sad', 'upset', 'angry', 'frustrated', 'annoyed', 'disappointed', 'terrible', 'awful', 'hate', 'stupid', 'worst', 'stress', 'anxious', 'worried', 'lonely', 'depressed', 'cry', 'crying', 'fail', 'failed', 'mistake', 'problem', 'trouble', 'difficult', 'hard time']
  const sharingIndicators = ['got', 'achieved', 'accomplished', 'succeeded', 'won', 'promoted', 'excited', 'happy', 'glad', 'grateful', 'thankful', 'wonderful', 'amazing', 'fantastic', 'great news', 'celebrate', 'good thing', 'lucky', 'blessed', 'love', 'loved', 'enjoy', 'fun', 'happy']
  const excitedIndicators = ['!', 'wow', 'omg', 'oh my god', 'can\'t wait', 'so excited', 'can\'t believe', 'incredible', 'unbelievable', 'insane', ' nuts', 'bonkers']

  let ventingScore = 0
  let sharingScore = 0
  let excitedScore = 0

  for (const indicator of ventingIndicators) {
    if (lower.includes(indicator)) ventingScore++
  }
  for (const indicator of sharingIndicators) {
    if (lower.includes(indicator)) sharingScore++
  }
  for (const indicator of excitedIndicators) {
    if (lower.includes(indicator)) excitedScore++
  }

  if (ventingScore > sharingScore && ventingScore > excitedScore) {
    return 'venting'
  }
  if (sharingScore > ventingScore && sharingScore > excitedScore) {
    return 'sharing'
  }
  if (excitedScore > ventingScore && excitedScore > sharingScore) {
    return 'excited'
  }
  return 'neutral'
}

export async function generateContextualResponse(
  partialText: string,
  history: Message[],
  _scene: Scene,
  apiKey?: string,
  apiUrl?: string,
  apiModel?: string
): Promise<string> {
  const emotionalContext = detectEmotionalContext(partialText)
  const responses = contextualResponses[emotionalContext]

  if (apiKey) {
    try {
      const systemPrompt = `You are Emma, a warm and empathetic English tutor. The student is sharing something in listening mode. Your role is to be a supportive listener.

Based on what the student just said, analyze the emotional context:
- If they seem to be venting or expressing frustration: respond with empathy and understanding
- If they are sharing good news or something positive: respond with genuine happiness and interest
- If they seem excited: match their energy with enthusiasm
- If they are just sharing neutrally: acknowledge and encourage them to continue

Keep your response VERY brief (1-2 sentences max). Be warm, human, and natural. Do NOT give long responses. Do NOT correct grammar. Just listen and respond with appropriate emotion.`

      const messages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemPrompt },
      ]

      const recentHistory = history.slice(-4)
      for (const msg of recentHistory) {
        if (msg.role !== ('system' as any)) {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          })
        }
      }

      messages.push({ role: 'user', content: partialText })

      const text = await fetchDirect(apiKey, apiUrl!, {
        model: apiModel || 'deepseek-chat',
        messages,
        temperature: 0.8,
        max_tokens: 50,
      })
      return text
    } catch (err) {
      console.error('Contextual response API failed, using local:', err)
    }
  }

  return responses[Math.floor(Math.random() * responses.length)]
}