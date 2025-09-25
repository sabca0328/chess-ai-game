# AI 西洋棋 Web Game

一個基於 Cloudflare Workers 的現代化西洋棋遊戲，支援 PVP 對戰和 AI 對手。

🌐 **線上體驗：** https://chess-ai-game.omni-worker.workers.dev

## 🚀 快速開始

### 前置需求
- Node.js 18+
- Wrangler CLI
- Cloudflare 帳號

### 安裝部署

```bash
# 克隆專案
git clone <repository-url>
cd chess-ai-game

# 安裝依賴
npm install

# 配置 Cloudflare
wrangler login

# 建立資源
wrangler kv:namespace create "USERS"
wrangler kv:namespace create "GAMES"

# 更新 wrangler.toml 中的資源 ID

# 本地開發
npm run dev

# 部署
npm run deploy
```

## 🏗️ 技術架構

### 後端
- **Cloudflare Workers** - 無伺服器運行時
- **Durable Objects** - 狀態管理和遊戲邏輯
  - `GameRoom` - 遊戲房間管理
  - `Lobby` - 大廳管理
- **Cloudflare AI** - AI 模型推理
- **KV Storage** - 用戶數據和遊戲記錄存儲

### 前端
- **Vanilla JavaScript** - 無框架前端
- **Chess.js** - 西洋棋規則引擎
- **CSS Flexbox** - 響應式佈局
- **Fetch API** - HTTP 通信（輪詢模式）

### AI 集成
- **模型**: `@cf/meta/llama-2-7b-chat-int8`
- **格式**: 座標格式移動（如 `e2-e4`）
- **語言**: 繁體中文提示和評估
- **重試**: 指數退避重試機制

## 📁 專案結構

```
src/
├── index.js              # Workers 入口點
└── durable-objects/
    ├── GameRoom.js       # 遊戲房間邏輯
    └── Lobby.js          # 大廳管理

static/
├── index.html            # 前端頁面
├── css/style.css         # 樣式文件
└── js/
    ├── app.js            # 前端應用邏輯
    └── chess-wrapper.js  # Chess.js 封裝
```

## 🎮 核心功能

### 遊戲功能
- 完整西洋棋規則實現
- 實時 PVP 對戰
- AI 對手（初學者等級）
- 棋鐘系統
- 移動驗證

### AI 功能
- 智能移動建議
- 局勢分析顯示
- 繁體中文提示
- 自動重試機制

### UI 特性
- 響應式設計（桌面/平板/手機）
- 棋盤座標顯示
- 即時聊天系統
- 房間管理

## 🔧 配置

### AI 模型配置
```javascript
// src/index.js
const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
  messages: [{ role: 'system', content: 'AI 提示詞' }]
});
```

### 遊戲規則
在 `src/durable-objects/GameRoom.js` 中調整遊戲邏輯。

### UI 樣式
在 `static/css/style.css` 中自定義樣式。

## 📊 性能指標

- **AI 響應時間**: ≤ 3s（含重試）
- **PVP 同步延遲**: ≤ 1s
- **UI 響應時間**: ≤ 100ms
- **支援螢幕**: 1920x1080 至 320x568

## 🛠️ 開發

### 本地開發
```bash
npm run dev          # 啟動開發服務器
npm run preview      # 預覽生產版本
npm run tail         # 查看日誌
```

### 部署
```bash
npm run deploy       # 部署到生產環境
```

### 數據管理
```bash
npm run kv:list      # 列出 KV 數據
npm run d1:list      # 列出 D1 數據
```

## 📝 API 端點

### 遊戲 API
- `POST /api/rooms` - 創建房間
- `GET /api/rooms` - 獲取房間列表
- `POST /api/rooms/:id/join` - 加入房間
- `POST /api/rooms/:id/leave` - 離開房間

### AI API
- `POST /api/game/ai-opponent` - AI 對手移動
- `POST /api/game/ai-suggest` - AI 移動建議

### 用戶 API
- `POST /api/auth/register` - 註冊用戶
- `POST /api/auth/login` - 用戶登入

## 🔒 安全特性

- 輸入驗證和清理
- CORS 配置
- 權限控制
- 數據加密

## 📄 授權

MIT License - 詳見 [LICENSE](LICENSE) 文件

## 🙏 致謝

- [Chess.js](https://github.com/jhlywa/chess.js) - 西洋棋規則引擎
- [Cloudflare Workers](https://workers.cloudflare.com/) - 無伺服器平台
- [Cloudflare AI](https://ai.cloudflare.com/) - AI 服務

---

**享受您的 AI 西洋棋遊戲體驗！♔**