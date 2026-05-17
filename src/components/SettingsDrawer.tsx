import { useState } from 'react'
import type { Accent, Difficulty, APIConfig, ApiPlatform } from '../types'
import { ACCENT_LABELS, DIFFICULTY_LABELS, API_PLATFORM_LABELS, API_PLATFORM_DEFAULTS } from '../types'

interface UserInfo {
  displayName: string
  email: string
  weekUsage: number
  weekLimit: number
}

interface SettingsDrawerProps {
  isOpen: boolean
  accent: Accent
  difficulty: Difficulty
  correctionEnabled: boolean
  listeningModeEnabled: boolean
  apis: APIConfig[]
  activeApiId: string | null
  onAccentChange: (accent: Accent) => void
  onDifficultyChange: (difficulty: Difficulty) => void
  onCorrectionToggle: () => void
  onListeningModeToggle: () => void
  onAddApi: (api: Omit<APIConfig, 'id'>) => void
  onUpdateApi: (id: string, api: Omit<APIConfig, 'id'>) => void
  onRemoveApi: (id: string) => void
  onSetActiveApi: (id: string | null) => void
  onClose: () => void
  onLogout?: () => void
  user?: UserInfo
}

export function SettingsDrawer({
  isOpen,
  accent,
  difficulty,
  correctionEnabled,
  listeningModeEnabled,
  apis,
  activeApiId,
  onAccentChange,
  onDifficultyChange,
  onCorrectionToggle,
  onListeningModeToggle,
  onAddApi,
  onUpdateApi,
  onRemoveApi,
  onSetActiveApi,
  onClose,
  onLogout,
  user,
}: SettingsDrawerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [apiName, setApiName] = useState('')
  const [apiPlatform, setApiPlatform] = useState<ApiPlatform>('deepseek')
  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [apiModel, setApiModel] = useState('')

  const handlePlatformChange = (platform: ApiPlatform) => {
    setApiPlatform(platform)
    setApiUrl(API_PLATFORM_DEFAULTS[platform].url)
    setApiModel(API_PLATFORM_DEFAULTS[platform].model)
  }

  const handleAddApi = () => {
    const trimmedKey = apiKey.trim()
    const trimmedName = apiName.trim()
    if (!trimmedKey) return

    onAddApi({
      name: trimmedName || API_PLATFORM_LABELS[apiPlatform],
      platform: apiPlatform,
      apiKey: trimmedKey,
      apiUrl: apiUrl.trim() || API_PLATFORM_DEFAULTS[apiPlatform].url,
      apiModel: apiModel.trim() || API_PLATFORM_DEFAULTS[apiPlatform].model,
    })

    setApiName('')
    setApiKey('')
    setApiPlatform('deepseek')
    setApiUrl('')
    setApiModel('')
    setShowAddForm(false)
  }

  const startEditing = (api: APIConfig) => {
    setShowAddForm(false)
    setEditingId(api.id)
    setApiName(api.name)
    setApiPlatform(api.platform)
    setApiUrl(api.apiUrl)
    setApiModel(api.apiModel)
    setApiKey('')
  }

  const handleUpdateApi = () => {
    const trimmedName = apiName.trim()
    if (!editingId) return

    onUpdateApi(editingId, {
      name: trimmedName || API_PLATFORM_LABELS[apiPlatform],
      platform: apiPlatform,
      apiKey: '',
      apiUrl: apiUrl.trim() || API_PLATFORM_DEFAULTS[apiPlatform].url,
      apiModel: apiModel.trim() || API_PLATFORM_DEFAULTS[apiPlatform].model,
    })

    setEditingId(null)
    setApiName('')
    setApiPlatform('deepseek')
    setApiUrl('')
    setApiModel('')
    setApiKey('')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setApiName('')
    setApiPlatform('deepseek')
    setApiUrl('')
    setApiModel('')
    setApiKey('')
  }

  const activeApi = apis.find((a) => a.id === activeApiId)

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
          {/* API Management Section */}
          <div className="setting-group">
            <label className="setting-label">AI 接口管理</label>

            {apis.length > 0 && (
              <div className="api-list">
                {apis.map((api) => (
                  <div
                    key={api.id}
                    className={`api-card ${api.id === activeApiId ? 'active' : ''} ${editingId === api.id ? 'editing' : ''}`}
                  >
                    {editingId === api.id ? (
                      <div className="api-edit-form">
                        <div className="api-form-row">
                          <input
                            type="text"
                            className="api-form-input"
                            placeholder="API 名称"
                            value={apiName}
                            onChange={(e) => setApiName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateApi()
                            }}
                          />
                        </div>

                        <div className="api-form-row">
                          <label className="api-form-label">平台</label>
                          <div className="platform-options">
                            {(Object.keys(API_PLATFORM_LABELS) as ApiPlatform[]).map((p) => (
                              <button
                                key={p}
                                className={`platform-option ${apiPlatform === p ? 'selected' : ''}`}
                                onClick={() => handlePlatformChange(p)}
                              >
                                {API_PLATFORM_LABELS[p]}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="api-form-row">
                          <label className="api-form-label">API URL</label>
                          <input
                            type="text"
                            className="api-form-input"
                            placeholder="https://api.example.com/v1"
                            value={apiUrl}
                            onChange={(e) => setApiUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateApi()
                            }}
                          />
                        </div>

                        <div className="api-form-row">
                          <label className="api-form-label">模型名称</label>
                          <input
                            type="text"
                            className="api-form-input"
                            placeholder="如: deepseek-chat / qwen-plus"
                            value={apiModel}
                            onChange={(e) => setApiModel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateApi()
                            }}
                          />
                        </div>

                        <div className="api-form-row">
                          <label className="api-form-label">密钥</label>
                          <div className="api-key-locked">已设置，不可查看</div>
                        </div>

                        <div className="api-form-actions">
                          <button className="api-cancel-btn" onClick={cancelEditing}>
                            取消
                          </button>
                          <button className="api-save-btn" onClick={handleUpdateApi}>
                            保存
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className="api-card-info"
                          onClick={() => onSetActiveApi(api.id === activeApiId ? null : api.id)}
                        >
                          <div className="api-card-name">{api.name}</div>
                          <div className="api-card-detail">
                            <span className="api-platform-badge">{API_PLATFORM_LABELS[api.platform]}</span>
                            <span className="api-model-text">{api.apiModel}</span>
                          </div>
                        </div>
                        <div className="api-card-actions">
                          <button
                            className="api-edit-btn"
                            onClick={(e) => { e.stopPropagation(); startEditing(api) }}
                            title="编辑 API"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                          </button>
                          <button
                            className="api-delete-btn"
                            onClick={(e) => { e.stopPropagation(); onRemoveApi(api.id) }}
                            title="删除 API"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!showAddForm ? (
              <button className="api-add-btn" onClick={() => setShowAddForm(true)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                添加 API
              </button>
            ) : (
              <div className="api-add-form">
                <div className="api-form-row">
                  <input
                    type="text"
                    className="api-form-input"
                    placeholder="API 名称（可选，如：我的DeepSeek）"
                    value={apiName}
                    onChange={(e) => setApiName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddApi()
                    }}
                  />
                </div>

                <div className="api-form-row">
                  <label className="api-form-label">平台</label>
                  <div className="platform-options">
                    {(Object.keys(API_PLATFORM_LABELS) as ApiPlatform[]).map((p) => (
                      <button
                        key={p}
                        className={`platform-option ${apiPlatform === p ? 'selected' : ''}`}
                        onClick={() => handlePlatformChange(p)}
                      >
                        {API_PLATFORM_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="api-form-row">
                  <label className="api-form-label">API URL</label>
                  <input
                    type="text"
                    className="api-form-input"
                    placeholder="https://api.example.com/v1"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddApi()
                    }}
                  />
                  <p className="setting-hint">
                    {apiPlatform === 'custom'
                      ? '输入 API 基础 URL，将自动拼接 /chat/completions'
                      : '可留空使用默认地址'}
                  </p>
                </div>

                <div className="api-form-row">
                  <label className="api-form-label">模型名称</label>
                  <input
                    type="text"
                    className="api-form-input"
                    placeholder="如: deepseek-chat / qwen-plus / glm-4-flash"
                    value={apiModel}
                    onChange={(e) => setApiModel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddApi()
                    }}
                  />
                </div>

                <div className="api-form-row">
                  <label className="api-form-label">API Key</label>
                  <div className="api-key-input-row">
                    <input
                      type="password"
                      className="api-form-input"
                      placeholder="输入你的 API Key..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddApi()
                      }}
                      autoFocus
                    />
                    <button
                      className="api-key-add-btn"
                      onClick={handleAddApi}
                      disabled={!apiKey.trim()}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      添加
                    </button>
                  </div>
                </div>

                <div className="api-form-actions">
                  <button className="api-cancel-btn" onClick={() => setShowAddForm(false)}>
                    取消
                  </button>
                  <button
                    className="api-save-btn"
                    onClick={handleAddApi}
                    disabled={!apiKey.trim()}
                  >
                    保存
                  </button>
                </div>
              </div>
            )}

            {apis.length === 0 && (
              <p className="setting-hint">
                添加一个或多个 AI 平台的 API Key，可在不同 AI 之间自由切换，所有 AI 共享同一套对话记忆。
              </p>
            )}

            {activeApi && (
              <p className="setting-hint active-api-hint">
                当前激活：<strong>{activeApi.name}</strong> ({API_PLATFORM_LABELS[activeApi.platform]})
              </p>
            )}
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

          {user && onLogout && (
            <div className="setting-group">
              <div className="user-info-section">
                <div className="user-info-line">
                  <span className="user-info-label">账号</span>
                  <span className="user-info-value">{user.email}</span>
                </div>
                <div className="user-info-line">
                  <span className="user-info-label">本周用量</span>
                  <span className="user-info-value">{user.weekUsage} / {user.weekLimit} 次</span>
                </div>
                <button className="settings-logout-btn" onClick={onLogout}>
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}