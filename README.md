# CallEnglish — AI 英语陪练电话

一个通过模拟电话界面练习英语口语的 Web 应用。AI 外教 Emma 全程英文对话，实时语音识别 + 语音合成，支持场景切换、难度调节、语法纠错和通话历史。

---

## 一、技术架构

```
┌─────────────────────────────────────────────┐
│                  用户浏览器                   │
│                                             │
│  ┌──────────┐   ┌───────────┐   ┌───── ──┐  │
│  │  React   │   │Web Speech │   │DeepSeek│  │
│  │   UI     │◄─►│    API    │   │ API    │  │
│  └──────────┘   └───────────┘   └────── ─┘  │
│       │                │                    │
│  localStorage      MediaStream              │
│  (设置/历史)      (麦克风音频)                 │
└─────────────────────────────────────────────┘
        │
   IGA Pages
  (静态托管)
```

| 分层 | 技术 | 作用 |
|------|------|------|
| UI 层 | React 19 + TypeScript | 组件化界面，状态管理 |
| 构建 | Vite 8 | 极速开发服务器 + 生产构建 |
| 语音识别 | Web Speech API (`SpeechRecognition`) | 浏览器原生语音转文字 |
| 语音合成 | Web Speech API (`SpeechSynthesis`) | 文字转语音播报 AI 回复 |
| AI 对话 | DeepSeek API（用户配置 Key）| 真实英文对话生成 |
| 数据持久化 | `localStorage` | 设置、通话历史 |
| 部署 | IGA Pages | 静态站点托管 |

**重要**：本项目是**纯前端应用**，无后端服务器。AI 对话依赖用户自己在设置中填入 DeepSeek API Key，数据全部存储在浏览器本地。

---

## 二、目录结构

```
my-react-app/
├── .iga/                    # IGA Pages 部署配置
│   └── project.json        # 项目 ID 和名称
├── dist/                    # 生产构建产物（部署用）
│   ├── assets/
│   ├── index.html
│   └── favicon.svg
├── public/                  # 静态资源（不经过构建）
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── components/          # UI 组件
│   │   ├── CallArea.tsx        # 通话主界面（波形 + 对话气泡）
│   │   ├── WaveformAnimation.tsx # 麦克风波形（Canvas 实时渲染）
│   │   ├── ControlPanel.tsx     # 底部控制面板（静音/挂断）
│   │   ├── ConversationBubbles.tsx # 对话气泡列表
│   │   ├── HistoryPage.tsx      # 历史通话记录
│   │   ├── SettingsDrawer.tsx    # 设置抽屉（API Key / 难度 / 语速）
│   │   ├── StatusBar.tsx        # 顶部状态栏
│   │   └── ...
│   ├── hooks/                # 可复用的业务逻辑
│   │   ├── useAudioVisualizer.ts   # 麦克风音量可视化
│   │   ├── useSpeechRecognition.ts # 语音识别（Web Speech API）
│   │   ├── useSpeechSynthesis.ts   # 语音合成（TTS）
│   │   ├── useCallTimer.ts        # 通话计时器
│   │   └── useLocalStorage.ts     # localStorage 存取
│   ├── services/
│   │   └── openai.ts         # DeepSeek API 调用封装
│   ├── data/
│   │   └── scenarios.ts      # 场景数据 + 本地回复生成
│   ├── types/
│   │   └── index.ts          # TypeScript 类型定义
│   ├── App.tsx               # 根组件，核心状态逻辑
│   ├── App.css               # 全局样式
│   ├── index.css             # CSS 重置 + 主题变量
│   └── main.tsx              # 入口文件
├── index.html                # HTML 模板
├── vite.config.ts            # Vite 配置
├── tsconfig.json             # TypeScript 全局配置
├── tsconfig.app.json         # TypeScript 应用配置
├── package.json              # 依赖
└── README.md                 # 本文件
```

---

## 三、开发环境

**要求：**

- **Node.js** ≥ 18（推荐 20 LTS）
- **包管理器**：npm（已配置国内镜像）
- **浏览器**：Chrome 浏览器（语音 API 仅 Chrome/Edge 支持）

**检查命令：**

```powershell
node --version
npm --version
```

---

## 四、本地开发

```bash
# 进入项目目录
cd my-react-app

# 安装依赖（首次运行或 package.json 变化后）
npm install

# 启动开发服务器（热更新）
npm run dev
```

浏览器打开 `http://localhost:5173`，即可看到应用。

> **注意**：语音识别和麦克风功能需要在 HTTP/HTTPS 环境才能使用，`localhost` 除外。开发服务器 `vite` 默认就是 `localhost`，直接可用。

---

## 五、生产构建

```bash
# 构建产物到 dist/
npm run build

# 本地预览构建结果
npm run preview
```

`dist/` 目录内的文件即可部署到任意静态托管平台（IGA Pages、Netlify、Vercel 等）。

---

## 六、部署到 IGA Pages

### 方式一：命令行部署

```bash
cd my-react-app

# 全局安装 iga 工具（首次）
npm install -g @iga/cli

# 登录（按提示输入 Token）
iga login

# 构建 + 上传
iga deploy
```

### 方式二：手动上传

1. 运行 `npm run build`
2. 将 `dist/` 整个目录打包
3. 在 [IGA Pages 控制台](https://iga.igencloud.com) 手动上传

---

## 七、API Key 配置

本应用支持接入 **DeepSeek**（推荐）或 OpenAI 兼容 API。

### 获取 DeepSeek API Key

1. 访问 [platform.deepseek.com](https://platform.deepseek.com)
2. 注册账号并充值（如需，DeepSeek 价格极低）
3. 在「API Keys」页面创建一个 Key
4. 复制备用

### 在应用中配置

1. 点击右上角「设置」⚙️
2. 找到「API 配置」区域
3. 粘贴 Key，按 **Enter** 确认（不可复制，防止泄露）
4. 可选：切换模型（默认 `deepseek-chat`）
5. 如需更换，点击 Key 旁边的删除按钮重新输入

> **安全提示**：Key 仅存储在浏览器 `localStorage` 中，不会发送到任何除你指定的 API URL 以外的服务器。请勿在任何地方公开你的 Key。

---

## 八、核心功能模块

### 8.1 通话流程

```
用户点击"开始通话"
  → 1.5秒拨号动画
  → AI 接入（API Key 有配置则用 AI，否则本地模板）
  → AI 说开场白（TTS 语音播报）
  → 用户说话（语音识别）
  → 2秒静音后自动提交
  → AI 回复（循环）
  → 用户挂断
  → 通话结束，保存历史
```

### 8.2 语音识别（`useSpeechRecognition.ts`）

- 引擎：浏览器原生 `SpeechRecognition`
- 语言：`en-US`
- 特性：
  - `continuous: true` — 持续聆听，不中断
  - `interimResults: true` — 实时显示识别中间结果
  - **2 秒静音超时**：停顿 2 秒自动提交识别内容
  - 多次识别结果累积拼接，支持说话中停顿

### 8.3 麦克风波形（`useAudioVisualizer.ts`）

- 数据来源：`AnalyserNode` + `getByteTimeDomainData`
- 分贝计算：RMS 均方根 → `20*log10(rms)`
- 渲染：Canvas 2D，每帧绘制圆角矩形条
- 平滑：Lerp 插值，响应快但不跳变
- 静音状态：渐变消失，不突兀

### 8.4 AI 对话（`services/openai.ts`）

- 接入 DeepSeek `/chat/completions` API
- System Prompt 构建 Emma 人设 + 难度适配
- 支持 10 轮对话历史上下文
- API 异常时自动降级到本地模板回复

### 8.5 场景与难度（`data/scenarios.ts`）

| 场景 | 描述 |
|------|------|
| Daily | 日常口语 |
| Business | 商务英语 |
| Travel | 旅行交通 |

| 难度 | 纠错粒度 |
|------|---------|
| Beginner | 大胆说，只纠重大错误 |
| Intermediate | 常见语法错误 |
| Advanced | 细微表达优化 |

---

## 九、主题定制

应用支持深色/浅色模式，跟随系统设置。

修改颜色变量在 `src/index.css`：

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f1f5f9;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --primary: #6366f1;      /* 主色调 */
  --accent: #22c55e;       /* AI 回复色调 */
}
```

---

## 十、常见问题

### Q: 麦克风不工作？

1. 确认使用 Chrome/Edge 浏览器
2. 确认已授权麦克风权限（地址栏左侧会有提示）
3. 检查系统麦克风是否被其他应用占用

### Q: AI 没有真正回复，说的话牛头不对马嘴？

确认已在设置中填入有效的 **DeepSeek API Key**，并按 Enter 确认保存。无 Key 时会降级到本地固定模板回复。

### Q: 波形一直不动？

检查麦克风是否被语音识别占用（语音识别和波形可视化各需要一个独立的 `MediaStream`）。代码已有互斥处理，如仍有问题可刷新页面重试。

### Q: 如何清除所有历史记录？

在浏览器控制台执行：
```js
localStorage.removeItem('callEnglishHistory')
localStorage.removeItem('callEnglishSettings')
location.reload()
```

### Q: 部署后某些功能不工作？

确认使用的是 **HTTPS** 访问。麦克风、语音 API 在 HTTP 下受限（`localhost` 除外）。

---

## 十一、后续开发建议

本项目是纯前端，可按需扩展：

| 方向 | 说明 |
|------|------|
| **后端服务** | 接入 Node.js/Python 后端，托管 API Key，用户无需自己配置 |
| **用户系统** | 添加登录注册，跨设备同步历史 |
| **录音回放** | 通话过程录音，可回放复盘 |
| **评分系统** | 接入语言评测 API，给发音打分 |
| **多语言** | 支持日语、韩语等更多语言练习 |

---

*最后更新：2026-05-10 · CallEnglish v1.0*
