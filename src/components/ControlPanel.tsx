import type { Scene } from '../types'
import { SCENE_LABELS } from '../types'

interface ControlPanelProps {
  isMuted: boolean
  speed: number
  scene: Scene
  onToggleMute: () => void
  onSpeedChange: (speed: number) => void
  onSceneChange: (scene: Scene) => void
  disabled: boolean
}

export function ControlPanel({
  isMuted,
  speed,
  scene,
  onToggleMute,
  onSpeedChange,
  onSceneChange,
  disabled,
}: ControlPanelProps) {
  return (
    <div className={`control-panel ${disabled ? 'disabled' : ''}`}>
      <button
        className={`control-btn mute-btn ${isMuted ? 'muted' : ''}`}
        onClick={onToggleMute}
        disabled={disabled}
        title={isMuted ? '开启麦克风' : '关闭麦克风'}
      >
        {isMuted ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}
      </button>

      <div className="speed-control">
        <span className="control-label">语速</span>
        <input
          type="range"
          min="0.8"
          max="1.5"
          step="0.1"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="speed-slider"
        />
        <span className="speed-value">{speed.toFixed(1)}x</span>
      </div>

      <div className="scene-selector">
        <span className="control-label">场景</span>
        <select
          value={scene}
          onChange={(e) => onSceneChange(e.target.value as Scene)}
          disabled={disabled}
          className="scene-select"
        >
          {(Object.keys(SCENE_LABELS) as Scene[]).map((s) => (
            <option key={s} value={s}>
              {SCENE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}