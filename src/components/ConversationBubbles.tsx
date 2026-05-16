import { useEffect, useRef } from 'react'
import type { Message } from '../types'

interface ConversationBubblesProps {
  messages: Message[]
}

export function ConversationBubbles({ messages }: ConversationBubblesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const visibleMessages = messages.slice(-4)

  return (
    <div className="conversation-bubbles">
      {visibleMessages.map((msg) => (
        <div key={msg.id} className={`bubble ${msg.role}`}>
          <div className="bubble-role">
            {msg.role === 'user' ? '你' : 'AI'}
          </div>
          <div className="bubble-content">{msg.content}</div>
          {msg.correction && (
            <div className="bubble-correction">{msg.correction}</div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}