export function WeChatRestriction() {
  return (
    <div className="wechat-restriction-overlay">
      <div className="wechat-restriction-card">
        <div className="wechat-restriction-icon">📱</div>
        <h2 className="wechat-restriction-title">请在浏览器中打开</h2>
        <div className="wechat-restriction-guide">
          <p>👉 点击右上角「···」</p>
          <p>👉 选择「在浏览器中打开」</p>
        </div>
        <div className="wechat-restriction-arrow">
          <div className="arrow-up-right"></div>
        </div>
      </div>
    </div>
  )
}