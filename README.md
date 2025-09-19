# AI 西洋棋 Web Game

一個基於 Cloudflare Developer Platform 的現代化 AI 西洋棋遊戲，支援 PVP 對戰、AI 對手和即時聊天功能。

## ✨ 主要功能

### 🎮 遊戲功能
- **完整西洋棋規則**：支援所有標準西洋棋規則，包含將軍、將死、和棋判定
- **PVP 對戰**：玩家間即時對戰，支援觀戰模式
- **AI 對手**：智能 AI 對手，適合初學者練習
- **棋鐘系統**：可配置的時間控制
- **移動驗證**：即時檢查非法移動並提供提示

### 🤖 AI 功能
- **AI 建議**：AI 助手提供最佳著法建議
- **AI 對手**：智能 AI 對手，適合初學者練習
- **對局分析**：自動生成對局報告和關鍵時刻分析
- **戰術提示**：根據棋局提供戰術建議

### 🏠 大廳系統
- **房間管理**：建立、加入、離開房間
- **玩家配對**：自動配對玩家
- **觀戰模式**：允許觀眾觀看對局
- **即時更新**：房間狀態即時同步

### 💬 社交功能
- **即時聊天**：遊戲內聊天系統
- **玩家互動**：悔棋請求、和棋提議、重賽請求
- **通知系統**：遊戲事件即時通知

## 🏗️ 技術架構

### 後端技術
- **Cloudflare Workers**：無伺服器運算平台
- **Workers AI**：AI 模型推理服務
- **Durable Objects**：狀態管理和 WebSocket 連接
- **KV Storage**：使用者資料和遊戲記錄
- **D1 Database**：關聯式資料庫

### 前端技術
- **原生 JavaScript**：現代 ES6+ 語法
- **Chess.js**：西洋棋規則引擎
- **WebSocket**：即時通訊
- **CSS Grid/Flexbox**：響應式佈局
- **現代 CSS**：動畫、漸變、陰影效果

### AI 模型
- **@cf/meta/llama-2-7b-chat-int8**：用於棋局分析和建議
- **自定義 Prompt**：針對西洋棋優化的 AI 提示詞
- **結構化輸出**：JSON 格式的 AI 回應

## 🚀 快速開始

### 前置需求
- Node.js 18+ 
- Wrangler CLI
- Cloudflare 帳號

### 安裝步驟

1. **克隆專案**
```bash
git clone <repository-url>
cd chess-ai-game
```

2. **安裝依賴**
```bash
npm install
```

3. **配置 Cloudflare**
```bash
# 登入 Cloudflare
wrangler login

# 建立必要的資源
wrangler kv:namespace create "USERS"
wrangler kv:namespace create "GAMES"
wrangler d1 create chess-game-db
```

4. **更新 wrangler.toml**
將上述命令產生的 ID 更新到 `wrangler.toml` 檔案中。

5. **本地開發**
```bash
npm run dev
```

6. **部署到生產環境**
```bash
npm run deploy
```

## 📁 專案結構

```
chess-ai-game/
├── src/
│   ├── index.js                 # 主要 Workers 入口
│   └── durable-objects/         # Durable Objects
│       ├── GameRoom.js          # 遊戲房間邏輯
│       └── Lobby.js             # 大廳管理邏輯
├── static/
│   ├── index.html               # 主要 HTML 檔案
│   ├── css/
│   │   └── style.css            # 樣式檔案
│   └── js/
│       └── app.js               # 前端應用邏輯
├── package.json                 # 專案依賴
├── wrangler.toml               # Cloudflare 配置
└── README.md                   # 專案說明
```

## 🎯 使用說明

### 玩家流程
1. **註冊/登入**：建立帳號或使用現有帳號登入
2. **進入大廳**：查看可用房間或建立新房間
3. **加入遊戲**：選擇房間加入，或建立自己的房間
4. **開始對弈**：與其他玩家或 AI 對戰
5. **遊戲結束**：查看對局報告，可選擇重賽

### AI 功能使用
- **AI 建議**：點擊「AI 建議」按鈕獲取當前局面的最佳著法
- **AI 對手**：在建立房間時啟用 AI 對手選項
- **初學者友好**：AI 對手專為初學者設計，提供適中的挑戰

### 房間設定
- **遊戲規則**：選擇標準、快棋、中速棋或古典棋
- **觀戰設定**：允許或禁止觀眾觀戰
- **AI 設定**：啟用或禁用 AI 對手功能

## 🔧 配置選項

### AI 模型設定
在 `src/index.js` 中可調整 AI 模型的提示詞和參數：

```javascript
const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
  messages: [
    {
      role: 'system',
      content: `自定義的 AI 提示詞`
    }
  ],
  stream: false
});
```

### 遊戲規則
在 `src/durable-objects/GameRoom.js` 中可調整遊戲規則和驗證邏輯。

### 樣式自訂
在 `static/css/style.css` 中可自訂 UI 樣式和主題色彩。

## 📊 效能指標

- **PVP 同步延遲**：≤ 1000ms
- **AI 建議回應**：≤ 3000ms
- **AI 對手回應**：≤ 3 秒
- **WebSocket 連接**：即時雙向通訊
- **棋盤渲染**：60fps 流暢動畫

## 🛡️ 安全性

- **輸入驗證**：所有使用者輸入都經過驗證
- **權限控制**：基於角色的存取控制
- **資料加密**：敏感資料加密儲存
- **CORS 設定**：適當的跨域資源共享設定

## 🔄 開發工作流程

### 本地開發
```bash
npm run dev
```

### 測試
```bash
# 執行測試（如果有的話）
npm test
```

### 部署
```bash
# 部署到 Cloudflare
npm run deploy
```

### 環境管理
- `wrangler.toml` 包含開發和生產環境配置
- 使用環境變數管理敏感資訊
- 支援多環境部署

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

## 📝 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

## 🙏 致謝

- [Chess.js](https://github.com/jhlywa/chess.js) - 西洋棋規則引擎
- [Cloudflare Workers](https://workers.cloudflare.com/) - 無伺服器平台
- [Cloudflare AI](https://ai.cloudflare.com/) - AI 服務

## 📞 支援

如有問題或建議，請：
- 開啟 [Issue](../../issues)
- 發送 [Pull Request](../../pulls)
- 聯繫開發團隊

---

**享受您的 AI 西洋棋遊戲體驗！♔**
