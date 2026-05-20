import { useState } from 'react'
import * as api from '../services/api'

interface Props {
  onLogin: (user: api.UserInfo) => void
}

export default function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(email, password, displayName || undefined)

      api.saveToken(result.token)
      onLogin(result.user)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">SEU-ENG</h1>
          <p className="login-subtitle">登录以开始练习</p>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >
            登录
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError('') }}
          >
            注册
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="login-field">
              <label className="login-label">昵称</label>
              <input
                className="login-input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="给自己起个名字"
                autoComplete="name"
              />
            </div>
          )}

          <div className="login-field">
            <label className="login-label">邮箱</label>
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              required
              autoComplete="email"
            />
          </div>

          <div className="login-field">
            <label className="login-label">密码</label>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位密码"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? '请稍候...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  )
}