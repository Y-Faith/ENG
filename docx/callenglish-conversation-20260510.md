# SEU-ENG 项目对话记录

> 存档日期：2026-05-10
> 存档位置：D:\c++\trae\docx\seu-eng-conversation-20260510.md

---

## 一、用户基本信息

- **身份**：编程零基础开发者，追求 Vibe Coding 极致体验
- **目标**：开发一个 AI 英语口语陪练 App「SEU-ENG」
- **协作方式**：与 AI 同频共舞，通过对话带教完成项目

---

## 二、项目现状

### 2.1 技术栈

| 分层 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript + Vite |
| 语音识别 | Web Speech API (SpeechRecognition) |
| 语音合成 | Web Speech API (SpeechSynthesis) |
| AI 对话 | DeepSeek API（用户自行配置 Key）|
| 数据存储 | localStorage |
| 部署平台 | GitHub Pages |
| 域名 | `yfaith.dpdens.org`（DigitalPlat 注册，Cloudflare DNS）|

### 2.2 项目目录

```
d:\c++\trae\my-react-app\
├── src/
│   ├── components/
│   │   ├── CallArea.tsx          # 通话主界面
│   │   ├── WaveformAnimation.tsx  # Canvas 麦克风波形
│   │   ├── ControlPanel.tsx       # 底部控制面板
│   │   ├── ConversationBubbles.tsx # 对话气泡
│   │   ├── HistoryPage.tsx        # 历史记录
│   │   ├── SettingsDrawer.tsx      # 设置抽屉（API Key 等）
│   │   └── StatusBar.tsx          # 状态栏
│   ├── hooks/
│   │   ├── useAudioVisualizer.ts  # 麦克风实时音量（Canvas）
│   │   ├── useSpeechRecognition.ts # 语音识别
│   │   ├── useSpeechSynthesis.ts   # TTS
│   │   ├── useCallTimer.ts        # 通话计时
│   │   └── useLocalStorage.ts     # localStorage 封装
│   ├── services/
│   │   └── openai.ts             # DeepSeek API 调用
│   ├── data/
│   │   └── scenarios.ts          # 场景/难度/本地回复
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx                   # 根组件
│   └── App.css
├── dist/                         # 已构建产物（已部署 GitHub Pages）
└── README.md                     # 工程说明书（2026-05-10 编写）
```

### 2.3 已部署地址

- 前端：`https://yfaith.github.io/ENG`（GitHub Pages）

---

## 三、已解决的问题（完整时间线）

### 第一阶段：项目初始化
1. Node.js + npm 国内镜像安装
2. Vite + React + TypeScript 项目创建
3. 语音识别/合成基本功能
4. 对话气泡、历史记录、通话计时

### 第二阶段：调试与修复
1. 解决 `Cannot read properties of undefined (reading 'greetings')` 错误
2. 解决 AI 听不到用户说话问题（语音识别 closure 问题）
3. 添加通话历史功能
4. 解决波形动画不动问题（AudioContext suspended + 幂次频率映射）
5. 解决"正在聆听"与"你在说话"状态冲突
6. 麦克风波形改为录音器风格（Canvas + RMS 分贝）
7. 静音按钮功能：从静音 AI 改为静音麦克风（控制语音识别）
8. 历史记录页返回键失效修复

### 第三阶段：API 集成 + 安全
1. 接入 DeepSeek API（用户推荐）
2. 对话开始即接入 AI 生成开场白（而非本地模板）
3. API Key 安全处理：Enter 提交、不可复制、删除功能
4. 通话开始前 API Key 检查 + `callStatusRef` 守卫

### 第四阶段：波形动画重写（最新）
1. `getByteTimeDomainData` 替代 `getByteFrequencyData`（时域波形）
2. RMS 分贝计算驱动动画
3. Canvas 渲染替代 DOM div（性能优化）
4. 增益调整：`(db+48)/42` 映射 + `×5.0` 放大 + lerp 0.4
5. 移除 dB 数值显示
6. 静音超时从 3.5s → 2s，`continuous: true` 持续聆听

---

## 四、当前代码关键逻辑

### 4.1 通话流程（App.tsx handleCall）
```
setTimeout 1500ms 拨号
  → audioViz.start() 启动波形
  → generateAIResponse('', scene, difficulty, [], apiKey...) 生成开场白
  → speechSynth.speak() 播报
  → AI 说完切换 listening → startRecognition()
```

### 4.2 语音识别静音超时（useSpeechRecognition.ts）
- `continuous: true` 持续识别
- `interimResults: true` 实时中间结果
- 每次识别结果触发 → 清空 2s 定时器 → 重新计时
- 2s 静音 → `submitAndStop()` 强制提交

### 4.3 麦克风波形（useAudioVisualizer.ts）
- `getByteTimeDomainData` → RMS → 分贝 → 归一化 → 每根柱子振幅
- 回退机制：麦克风占用时用正弦波模拟
- Canvas 渲染，useEffect 响应 levels/decibels 变化

---

## 五、用户计划（未完成）

### 5.1 后端扩展（讨论但未实现）
- **技术选型**：Node.js + Express + SQLite
- **部署平台**：Railway（免费额度）
- **域名指向**：通过 Cloudflare DNS 将 `api.yfaith.dpdens.org` 指向 Railway
- **最小接口**（3个）：
  - `POST /api/chat` — 转发 DeepSeek
  - `GET /api/history` — 获取历史
  - `POST /api/history` — 保存通话
- **状态**：讨论中，用户决定暂不做

### 5.2 域名信息
- 域名：`yfaith.dpdens.org`
- 注册商：DigitalPlat Domains
- DNS 管理：Cloudflare
- 状态：DNS 未配置，无任何指向

---

## 六、用户特点与偏好

1. **编程零基础**，但理解力强，能跟上 AI 解释
2. **追求 Vibe Coding** — 通过对话驱动开发，不自己写代码
3. **中文交流**，术语偶尔用英文
4. **注重用户体验**：波形要像录音器、分贝响应要灵敏、静音超时要短但不打断正常表达
5. **注重隐私安全**：API Key 不可复制，防泄露
6. **务实**：暂缓后端，先完善前端

---

## 七、后续对话开头参考

下次对话可以这样开始：

```
我：继续上次的 SEU-ENG 项目。上次我们完成了：
1. 前端全部功能开发
2. 波形动画改成了 Canvas 录音器风格
3. 语音识别 2s 静音超时
4. API Key 设置安全（不可复制）
5. 部署到 GitHub Pages

我们接下来要做的是：[你的需求]
```

---

*由 Trae AI 生成 · 2026-05-10*
