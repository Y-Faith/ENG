import { useState, useMemo } from 'react'
import * as api from '../services/api'

interface UserInfo {
  id: string
  displayName: string
  email: string
  dayUsage: number
  dayLimit: number
}

interface AccountPageProps {
  user: UserInfo
  onClose: () => void
  onLogout: () => void
}

const AVATAR_COLORS = [
  '#E74C3C', '#E67E22', '#F39C12', '#27AE60',
  '#1ABC9C', '#2980B9', '#8E44AD', '#D35400',
  '#16A085', '#2C3E50', '#C0392B', '#7D3C98',
  '#2874A6', '#1E8449', '#B7950B', '#A93226',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitial(name: string): string {
  const ch = name.trim()[0]
  return ch ? ch.toUpperCase() : '?'
}

export function AccountPage({ user, onClose, onLogout }: AccountPageProps) {
  const [view, setView] = useState<'main' | 'password' | 'delete'>('main')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const avatarColor = useMemo(() => getAvatarColor(user.displayName), [user.displayName])
  const initial = useMemo(() => getInitial(user.displayName), [user.displayName])

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      setMsg('请填写所有字段')
      return
    }
    if (newPassword.length < 6) {
      setMsg('新密码至少 6 位')
      return
    }
    if (newPassword !== confirmPassword) {
      setMsg('两次密码不一致')
      return
    }
    setLoading(true)
    setMsg('')
    try {
      await api.changePassword(oldPassword, newPassword)
      setMsg('密码修改成功')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      setMsg(e.message || '修改失败')
    }
    setLoading(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      setMsg('请输入 DELETE 确认注销')
      return
    }
    setLoading(true)
    setMsg('')
    try {
      await api.deleteAccount()
      onLogout()
    } catch (e: any) {
      setMsg(e.message || '注销失败')
    }
    setLoading(false)
  }

  const usagePercent = Math.min((user.dayUsage / user.dayLimit) * 100, 100)

  return (
    <div className="account-page">
      <div className="account-page-header">
        <button className="account-page-back" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h2>{view === 'main' ? '账号详情' : view === 'password' ? '修改密码' : '注销账号'}</h2>
      </div>

      <div className="account-page-body">
        {view === 'main' && (
          <>
            <div className="account-page-avatar-section">
              <div className="account-page-avatar" style={{ background: avatarColor }}>
                <span className="account-page-avatar-letter">{initial}</span>
              </div>
              <div className="account-page-name">{user.displayName}</div>
              <div className="account-page-email">{user.email}</div>
            </div>

            <div className="account-page-section">
              <div className="account-page-section-title">用量信息</div>
              <div className="account-page-card">
                <div className="account-page-usage-row">
                  <span>今日已用</span>
                  <span className="account-page-usage-count">{user.dayUsage} / {user.dayLimit} 次</span>
                </div>
                <div className="account-page-usage-bar">
                  <div
                    className="account-page-usage-fill"
                    style={{
                      width: `${usagePercent}%`,
                      background: usagePercent > 80 ? 'var(--danger)' : 'var(--primary)',
                    }}
                  />
                </div>
                <div className="account-page-usage-hint">
                  {usagePercent >= 100 ? '今日用量已用完' : `剩余 ${user.dayLimit - user.dayUsage} 次`}
                </div>
              </div>
            </div>

            <div className="account-page-section">
              <div className="account-page-section-title">账号操作</div>
              <div className="account-page-card">
                <button className="account-page-action" onClick={() => { setView('password'); setMsg('') }}>
                  <div className="account-page-action-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                  </div>
                  <span>修改密码</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="account-page-action-arrow"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </button>
                <button className="account-page-action danger" onClick={() => { setView('delete'); setMsg('') }}>
                  <div className="account-page-action-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </div>
                  <span>注销账号</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="account-page-action-arrow"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </button>
                <button className="account-page-action logout" onClick={onLogout}>
                  <div className="account-page-action-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                  </div>
                  <span>退出登录</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="account-page-action-arrow"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </button>
              </div>
            </div>
          </>
        )}

        {view === 'password' && (
          <div className="account-page-form">
            <div className="account-page-card">
              <div className="account-page-field">
                <label>当前密码</label>
                <input
                  type="password"
                  placeholder="输入当前密码"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>
              <div className="account-page-field">
                <label>新密码</label>
                <input
                  type="password"
                  placeholder="至少 6 位"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="account-page-field">
                <label>确认新密码</label>
                <input
                  type="password"
                  placeholder="再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            {msg && <p className={`account-page-msg ${msg.includes('成功') ? 'success' : ''}`}>{msg}</p>}
            <button className="account-page-btn primary" onClick={handleChangePassword} disabled={loading}>
              {loading ? '修改中...' : '确认修改'}
            </button>
          </div>
        )}

        {view === 'delete' && (
          <div className="account-page-form">
            <div className="account-page-card warning-card">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="var(--danger)">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              <p>此操作不可恢复！所有数据将被永久删除，包括对话记录和 AI 记忆。</p>
            </div>
            <div className="account-page-card">
              <div className="account-page-field">
                <label>输入 DELETE 确认</label>
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                />
              </div>
            </div>
            {msg && <p className="account-page-msg">{msg}</p>}
            <button className="account-page-btn danger" onClick={handleDeleteAccount} disabled={loading}>
              {loading ? '注销中...' : '确认注销'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
