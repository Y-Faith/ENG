import { useState, useEffect } from 'react'
import type { ConversationRecord, Scene } from '../types'
import { SCENE_LABELS } from '../types'
import * as api from '../services/api'

interface HistoryPageProps {
  onClose: () => void
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}分${secs}秒`
  }
  return `${secs}秒`
}

let messageIdCounter = 0
function generateId(): string {
  messageIdCounter++
  return `msg-${Date.now()}-${messageIdCounter}`
}

export function HistoryPage({ onClose }: HistoryPageProps) {
  const [records, setRecords] = useState<ConversationRecord[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHistory() {
      try {
        // 先尝试从服务器获取
        const response = await api.getHistory()
        if (response.conversations && response.conversations.length > 0) {
          const converted: ConversationRecord[] = response.conversations.map((conv) => ({
            id: conv.id,
            date: conv.started_at,
            scene: conv.scene as Scene,
            duration: conv.duration_seconds,
            messages: conv.messages.map((msg) => ({
              id: generateId(),
              role: msg.role as 'user' | 'ai',
              content: msg.content,
              timestamp: Date.now(),
            })),
          }))
          setRecords(converted.reverse())
          setLoading(false)
          return
        }
      } catch {
        // 服务器获取失败，尝试从本地获取
      }

      // 从本地获取
      try {
        const raw = localStorage.getItem('seuEngHistory')
        if (raw) {
          const parsed = JSON.parse(raw) as ConversationRecord[]
          setRecords(parsed.reverse())
        }
      } catch {
        setRecords([])
      }
      setLoading(false)
    }

    loadHistory()
  }, [])

  const handleDelete = (id: string) => {
    const updated = records.filter((r) => r.id !== id)
    setRecords(updated)
    try {
      localStorage.setItem('seuEngHistory', JSON.stringify(updated.reverse()))
    } catch {
      // ignore
    }
  }

  const handleClearAll = () => {
    setRecords([])
    try {
      localStorage.removeItem('seuEngHistory')
    } catch {
      // ignore
    }
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <button className="history-back" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h2>通话记录</h2>
        {records.length > 0 && (
          <button className="history-clear" onClick={handleClearAll}>
            清空
          </button>
        )}
      </div>

      <div className="history-list">
        {loading ? (
          <div className="history-empty">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.3">
              <path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
            </svg>
            <p>加载中...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="history-empty">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" opacity="0.3">
              <path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
            </svg>
            <p>暂无通话记录</p>
            <p className="history-empty-hint">开始一次通话后，记录将显示在这里</p>
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="history-card">
              <div
                className="history-card-header"
                onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
              >
                <div className="history-card-info">
                  <span className="history-scene">
                    {SCENE_LABELS[record.scene as Scene] ?? record.scene}
                  </span>
                  <span className="history-meta">
                    {formatDate(record.date)} · {formatDuration(record.duration)} · {record.messages.length} 条消息
                  </span>
                </div>
                <div className="history-card-actions">
                  <button
                    className="history-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(record.id)
                    }}
                    title="删除"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="currentColor"
                    className={`history-expand ${expandedId === record.id ? 'expanded' : ''}`}
                  >
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                  </svg>
                </div>
              </div>

              {expandedId === record.id && (
                <div className="history-messages">
                  {record.messages.map((msg) => (
                    <div key={msg.id} className={`history-msg ${msg.role}`}>
                      <span className="history-msg-role">
                        {msg.role === 'user' ? '你' : 'AI'}
                      </span>
                      <span className="history-msg-content">{msg.content}</span>
                      {msg.correction && (
                        <span className="history-msg-correction">{msg.correction}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}