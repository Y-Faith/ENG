import { useEffect, useRef } from 'react'
import type { Message } from '../types'

interface ConversationBubblesProps {
  messages: Message[]
  revealedChars: number
}

export function ConversationBubbles({ messages, revealedChars }: ConversationBubblesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, revealedChars])

  const visibleMessages = messages.slice(-4)

  return (
    <div className="conversation-bubbles">
      {visibleMessages.map((msg, idx) => {
        const isLatestAI = msg.role === 'ai' && idx === visibleMessages.length - 1
        const displayContent = isLatestAI
          ? msg.content.slice(0, revealedChars)
          : msg.content
        const isPartial = isLatestAI && revealedChars < msg.content.length

        return (
          <div key={msg.id} className={`bubble ${msg.role}`}>
            <div className="bubble-role">
              {msg.role === 'user' ? '你' : 'AI'}
            </div>
            <div className="bubble-content">
              {displayContent}
              {isPartial && <span className="typing-cursor">|</span>}
            </div>
            {msg.correction && (
              <div className="bubble-correction">{msg.correction}</div>
            )}
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}