import { useState } from 'react'
import type { Accent, Difficulty } from '../types'
import { ACCENT_LABELS, DIFFICULTY_LABELS } from '../types'

interface SettingsDrawerProps {
  isOpen: boolean
  accent: Accent
  difficulty: Difficulty
  correctionEnabled: boolean
  listeningModeEnabled: boolean
  apiKey: string
  onAccentChange: (accent: Accent) => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onCorrectionToggle: () => void
  onListeningModeToggle: () => void
  onApiKeyChange: (apiKey: string) => void
  onClose: () => void
}

export function SettingsDrawer({
  isOpen,
  accent,
  difficulty,
  correctionEnabled,
  listeningModeEnabled,
  apiKey,
  onAccentChange,
  onDifficultyChange,
  onCorrectionToggle,
  onListeningModeToggle,
  onApiKeyChange,
  onClose,
}: SettingsDrawerProps) {
  const [keyInput, setKeyInput] = useState('')
  const [isEditing, setIsEditing] = useState(!apiKey)

  const handleKeySubmit = () => {
    const trimmed = keyInput.trim()
    if (trimmed) {
      onApiKeyChange(trimmed)
      setKeyInput('')
      setIsEditing(false)
    }
  }

  const handleDeleteKey = () => {
    onApiKeyChange('')
    setKeyInput('')
    setIsEditing(true)
  }

  const maskedKey = apiKey ? apiKey.slice(0, 4) + '••••••••' + apiKey.slice(-4) : ''

  return (
    <>
      <div className={`settings-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`settings-drawer ${isOpen ? 'open' : ''}`}>
        <div className="settings-header">
          <h3>设置</h3>
          <button className="settings-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="settings-body">
          <div className="setting-group">
            <label className="setting-label">DeepSeek API Key</label>
            {apiKey && !isEditing ? (
              <div className="api-key-display">
                <span className="api-key-masked" onCopy={(e) => e.preventDefault()}>{maskedKey}</span>
                <button className="api-key-delete" onClick={handleDeleteKey} title="删除 Key">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            ) : (
              <input
                type="password"
                className="api-key-input"
                placeholder="输入你的 DeepSeek API Key 后按回车..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleKeySubmit()
                  }
                }}
                autoFocus={isEditing}
              />
            )}
            <p className="setting-hint">
              填入 API Key 后启用真实 AI 对话。在 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer">platform.deepseek.com</a> 获取
            </p>
          </div>

          <div className="setting-group">
            <label className="setting-label">AI 口音</label>
            <div className="accent-options">
              {(Object.keys(ACCENT_LABELS) as Accent[]).map((a) => (
                <button
                  key={a}
                  className={`accent-option ${accent === a ? 'selected' : ''}`}
                  onClick={() => onAccentChange(a)}
                >
                  {ACCENT_LABELS[a]}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">难度级别</label>
            <div className="difficulty-options">
              {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  className={`difficulty-option ${difficulty === d ? 'selected' : ''}`}
                  onClick={() => onDifficultyChange(d)}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">错误纠正</label>
            <div className="toggle-row">
              <span>{correctionEnabled ? '已开启' : '已关闭'}</span>
              <button
                className={`toggle-btn ${correctionEnabled ? 'on' : 'off'}`}
                onClick={onCorrectionToggle}
              >
                <div className="toggle-thumb" />
              </button>
            </div>
            <p className="setting-hint">
              开启后，AI 会实时指出发音或语法错误
            </p>
          </div>

          <div className="setting-group">
            <label className="setting-label">倾听模式</label>
            <div className="toggle-row">
              <span>{listeningModeEnabled ? '已开启' : '已关闭'}</span>
              <button
                className={`toggle-btn ${listeningModeEnabled ? 'on' : 'off'}`}
                onClick={onListeningModeToggle}
              >
                <div className="toggle-thumb" />
              </button>
            </div>
            <p className="setting-hint">
              适合初学者。AI 会在你停顿思考时给予鼓励，等你完整表达后再回应
            </p>
          </div>


        </div>
      </div>
    </>
  )
}