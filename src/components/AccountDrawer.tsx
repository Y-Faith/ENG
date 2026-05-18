import { useState } from 'react'
import * as api from '../services/api'

interface UserInfo {
  id: string
  displayName: string
  email: string
  weekUsage: number
  weekLimit: number
}

interface AccountDrawerProps {
  user: UserInfo
  onClose: () => void
  onLogout: () => void
  onUserUpdate: (user: UserInfo) => void
}

export function AccountDrawer({ user, onClose, onLogout, onUserUpdate: _onUserUpdate }: AccountDrawerProps) {
  const [view, setView] = useState<'main' | 'password' | 'delete'>('main')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>账号详情</h2>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        {view === 'main' && (
          <div className="account-main">
            <div className="account-avatar">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            <div className="account-info-card">
              <div className="account-info-row">
                <span className="account-info-label">昵称</span>
                <span className="account-info-value">{user.displayName}</span>
              </div>
              <div className="account-info-row">
                <span className="account-info-label">邮箱</span>
                <span className="account-info-value">{user.email}</span>
              </div>
              <div className="account-info-row">
                <span className="account-info-label">本周用量</span>
                <span className="account-info-value">{user.weekUsage} / {user.weekLimit} 次</span>
              </div>
              <div className="account-usage-bar">
                <div
                  className="account-usage-fill"
                  style={{ width: `${Math.min((user.weekUsage / user.weekLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="account-actions">
              <button className="account-action-btn" onClick={() => { setView('password'); setMsg('') }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                修改密码
              </button>
              <button className="account-action-btn danger" onClick={() => { setView('delete'); setMsg('') }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                注销账号
              </button>
              <button className="account-action-btn logout" onClick={onLogout}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                退出登录
              </button>
            </div>
          </div>
        )}

        {view === 'password' && (
          <div className="account-form">
            <button className="account-back" onClick={() => { setView('main'); setMsg('') }}>← 返回</button>
            <h3>修改密码</h3>
            <input
              type="password"
              placeholder="当前密码"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="新密码（至少 6 位）"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="确认新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {msg && <p className="account-msg">{msg}</p>}
            <button className="account-submit" onClick={handleChangePassword} disabled={loading}>
              {loading ? '修改中...' : '确认修改'}
            </button>
          </div>
        )}

        {view === 'delete' && (
          <div className="account-form">
            <button className="account-back" onClick={() => { setView('main'); setMsg(''); setDeleteConfirm('') }}>← 返回</button>
            <h3>注销账号</h3>
            <p className="account-warning">此操作不可恢复！所有数据将被永久删除。</p>
            <input
              type="text"
              placeholder='输入 DELETE 确认注销'
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            {msg && <p className="account-msg">{msg}</p>}
            <button className="account-submit danger" onClick={handleDeleteAccount} disabled={loading}>
              {loading ? '注销中...' : '确认注销'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
