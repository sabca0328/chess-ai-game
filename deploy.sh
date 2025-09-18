#!/bin/bash

echo "🚀 開始部署 AI 西洋棋遊戲..."

# 檢查是否已安裝 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ 未找到 wrangler CLI，請先安裝："
    echo "npm install -g wrangler"
    exit 1
fi

# 檢查是否已登入 Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "🔐 請先登入 Cloudflare："
    echo "wrangler login"
    exit 1
fi

# 安裝依賴
echo "📦 安裝依賴..."
npm install

# 建立必要的 Cloudflare 資源（如果不存在）
echo "🏗️ 檢查 Cloudflare 資源..."

# 檢查 USERS KV namespace
if ! wrangler kv:namespace list | grep -q "USERS"; then
    echo "📝 建立 USERS KV namespace..."
    wrangler kv:namespace create "USERS"
fi

# 檢查 GAMES KV namespace
if ! wrangler kv:namespace list | grep -q "GAMES"; then
    echo "📝 建立 GAMES KV namespace..."
    wrangler kv:namespace create "GAMES"
fi

# 檢查 D1 資料庫
if ! wrangler d1 list | grep -q "chess-game-db"; then
    echo "🗄️ 建立 D1 資料庫..."
    wrangler d1 create chess-game-db
fi

echo "✅ Cloudflare 資源檢查完成"

# 部署到 Cloudflare
echo "🚀 部署到 Cloudflare..."
wrangler deploy

if [ $? -eq 0 ]; then
    echo "🎉 部署成功！"
    echo "🌐 您的遊戲現在可以在 Cloudflare Workers 上運行了"
    echo "📱 使用瀏覽器訪問您的 Workers URL 開始遊戲"
else
    echo "❌ 部署失敗，請檢查錯誤訊息"
    exit 1
fi
