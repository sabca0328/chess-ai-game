# 貢獻指南

感謝您對 Chess AI Game 專案的關注！我們歡迎各種形式的貢獻。

## 🚀 如何貢獻

### 1. Fork 專案
1. 點擊 GitHub 頁面右上角的 "Fork" 按鈕
2. 將專案 fork 到您的 GitHub 帳號

### 2. 克隆專案
```bash
git clone https://github.com/您的用戶名/chess-ai-game.git
cd chess-ai-game
```

### 3. 設定上游倉庫
```bash
git remote add upstream https://github.com/原始倉庫/chess-ai-game.git
```

### 4. 建立功能分支
```bash
git checkout -b feature/您的功能名稱
# 或
git checkout -b fix/修復的問題
```

### 5. 安裝依賴
```bash
npm install
```

### 6. 進行開發
- 修改代碼
- 添加新功能
- 修復 bug
- 改善文檔

### 7. 測試您的更改
```bash
# 本地開發測試
npm run dev

# 檢查代碼格式
npm run lint  # 如果有設定 linting
```

### 8. 提交更改
```bash
git add .
git commit -m "feat: 添加新功能描述"
# 或
git commit -m "fix: 修復某某問題"
```

### 9. 推送分支
```bash
git push origin feature/您的功能名稱
```

### 10. 建立 Pull Request
1. 前往您的 GitHub fork 頁面
2. 點擊 "New Pull Request"
3. 選擇您的分支
4. 填寫 PR 描述
5. 提交 PR

## 📝 提交訊息規範

我們使用 [Conventional Commits](https://www.conventionalcommits.org/) 規範：

### 格式
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 類型 (type)
- `feat`: 新功能
- `fix`: 修復 bug
- `docs`: 文檔更新
- `style`: 代碼格式調整
- `refactor`: 代碼重構
- `test`: 測試相關
- `chore`: 構建過程或輔助工具的變動

### 範例
```bash
feat(ai): 添加坐標格式支援避免 SAN 歧義
fix(game): 修復移動驗證邏輯
docs(readme): 更新安裝說明
style(ui): 改善按鈕樣式
```

## 🎯 貢獻類型

### 🐛 Bug 修復
- 修復遊戲邏輯錯誤
- 修復 UI 顯示問題
- 修復 API 回應錯誤
- 修復性能問題

### ✨ 新功能
- 新的遊戲模式
- 新的 AI 功能
- 新的 UI 組件
- 新的 API 端點

### 📚 文檔改善
- 更新 README
- 添加 API 文檔
- 改善代碼註釋
- 添加使用範例

### 🎨 UI/UX 改善
- 改善用戶界面
- 優化用戶體驗
- 添加動畫效果
- 響應式設計

### ⚡ 性能優化
- 優化 AI 回應速度
- 減少內存使用
- 優化網絡請求
- 改善渲染性能

## 🔍 代碼審查流程

### 提交 PR 前檢查
- [ ] 代碼符合專案風格
- [ ] 添加了必要的測試
- [ ] 更新了相關文檔
- [ ] 提交訊息符合規範
- [ ] 沒有破壞性更改

### 審查標準
- **功能正確性**: 代碼是否按預期工作
- **代碼品質**: 是否易讀、易維護
- **性能影響**: 是否影響應用性能
- **安全性**: 是否有安全漏洞
- **文檔完整性**: 是否更新了相關文檔

## 🛠️ 開發環境設定

### 必要工具
- Node.js 18+
- npm 或 yarn
- Git
- Cloudflare 帳號 (用於測試)

### 本地開發
```bash
# 克隆專案
git clone https://github.com/您的用戶名/chess-ai-game.git

# 安裝依賴
npm install

# 設定 Cloudflare
wrangler login

# 本地開發
npm run dev
```

### 測試
```bash
# 運行測試 (如果有)
npm test

# 檢查代碼品質
npm run lint
```

## 📋 Issue 模板

### Bug 報告
```markdown
**Bug 描述**
簡潔描述 bug 的內容

**重現步驟**
1. 前往 '...'
2. 點擊 '...'
3. 滾動到 '...'
4. 看到錯誤

**預期行為**
描述您預期的行為

**實際行為**
描述實際發生的行為

**截圖**
如果適用，添加截圖

**環境信息**
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 90]
- Version: [e.g. 1.0.0]
```

### 功能請求
```markdown
**功能描述**
簡潔描述您想要的功能

**使用場景**
描述這個功能的使用場景

**替代方案**
描述您考慮過的其他解決方案

**額外信息**
添加任何其他相關信息
```

## 🤝 行為準則

### 我們的承諾
- 使用友好和包容的語言
- 尊重不同的觀點和經驗
- 接受建設性的批評
- 關注對社區最有利的事情
- 對其他社區成員保持同理心

### 不被接受的行為
- 使用性別化語言或評論
- 人身攻擊或政治言論
- 公開或私下騷擾
- 未經許可發布他人私人信息
- 其他不當行為

## 📞 獲得幫助

如果您需要幫助，可以：

1. **查看文檔**: 閱讀 README 和相關文檔
2. **搜尋 Issues**: 查看是否已有相關問題
3. **建立 Issue**: 如果找不到答案，建立新的 issue
4. **聯繫維護者**: 直接聯繫專案維護者

## 🙏 感謝

感謝所有貢獻者對專案的貢獻！您的努力讓這個專案變得更好。

---

**讓我們一起打造最好的 AI 西洋棋遊戲！♔**
