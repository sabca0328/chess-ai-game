# 部署指南

本指南將幫助您將 Chess AI Game 部署到 Cloudflare Workers 平台。

## 🚀 快速部署

### 1. 準備工作

#### 必要條件
- [Cloudflare 帳號](https://dash.cloudflare.com/sign-up)
- [Node.js 18+](https://nodejs.org/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

#### 安裝 Wrangler
```bash
npm install -g wrangler
```

### 2. 設定 Cloudflare 資源

#### 登入 Cloudflare
```bash
wrangler login
```

#### 建立 KV 命名空間
```bash
# 建立用戶資料 KV
wrangler kv:namespace create "USERS"
# 記下產生的 namespace_id

# 建立遊戲資料 KV
wrangler kv:namespace create "GAMES"
# 記下產生的 namespace_id
```

#### 建立 D1 資料庫
```bash
# 建立資料庫
wrangler d1 create chess-game-database
# 記下產生的 database_id
```

### 3. 配置專案

#### 更新 wrangler.toml
將上述命令產生的 ID 更新到 `wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "USERS"
id = "你的_USERS_namespace_id"

[[kv_namespaces]]
binding = "GAMES"
id = "你的_GAMES_namespace_id"

[[d1_databases]]
binding = "DB"
database_name = "chess-game-database"
database_id = "你的_database_id"
```

#### 更新 account_id
在 `wrangler.toml` 中更新您的 Cloudflare account_id：
```toml
account_id = "你的_account_id"
```

### 4. 安裝依賴
```bash
npm install
```

### 5. 本地測試
```bash
npm run dev
```

### 6. 部署到生產環境
```bash
npm run deploy
```

## 🔧 環境配置

### 開發環境
```bash
# 本地開發
npm run dev

# 預覽生產環境
wrangler deploy --env production
```

### 生產環境
```bash
# 部署到生產環境
npm run deploy

# 或指定環境
wrangler deploy --env production
```

## 📊 監控和日誌

### 查看日誌
```bash
# 即時日誌
wrangler tail

# 特定環境日誌
wrangler tail --env production
```

### 監控指標
- 在 Cloudflare Dashboard 查看 Workers 使用情況
- 監控 KV 和 D1 的使用量
- 查看 AI 請求的用量

## 🛠️ 故障排除

### 常見問題

#### 1. 部署失敗
```bash
# 檢查配置
wrangler whoami

# 檢查專案配置
wrangler dev --local
```

#### 2. KV 命名空間錯誤
```bash
# 列出所有 KV 命名空間
wrangler kv:namespace list

# 檢查特定命名空間
wrangler kv:key list --namespace-id=你的_namespace_id
```

#### 3. D1 資料庫錯誤
```bash
# 列出所有 D1 資料庫
wrangler d1 list

# 檢查資料庫結構
wrangler d1 execute chess-game-database --command "SELECT name FROM sqlite_master WHERE type='table';"
```

#### 4. AI 功能無法使用
- 確認 Cloudflare AI 已啟用
- 檢查 AI 綁定配置
- 確認有足夠的 AI 使用額度

### 調試模式
```bash
# 啟用詳細日誌
wrangler dev --local --verbose

# 檢查環境變數
wrangler secret list
```

## 🔒 安全性配置

### 環境變數
```bash
# 設定敏感資訊
wrangler secret put SECRET_KEY
wrangler secret put API_KEY
```

### CORS 設定
在 `src/index.js` 中調整 CORS 設定：
```javascript
headers: {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
```

### 速率限制
考慮在 Cloudflare Dashboard 設定速率限制規則。

## 📈 性能優化

### 快取設定
```javascript
// 在 API 回應中添加快取標頭
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'
  }
});
```

### 資源優化
- 壓縮靜態資源
- 使用 CDN 快取
- 優化圖片大小

## 🔄 持續部署

### GitHub Actions 範例
```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Deploy to Cloudflare
      uses: cloudflare/wrangler-action@v1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

## 📞 支援

如果遇到部署問題：

1. 檢查 [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
2. 查看 [Wrangler 文檔](https://developers.cloudflare.com/workers/wrangler/)
3. 在 GitHub 建立 Issue
4. 聯繫 Cloudflare 支援

---

**祝您部署順利！🚀**
