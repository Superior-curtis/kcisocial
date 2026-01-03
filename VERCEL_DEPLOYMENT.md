# Vercel KKBOX 免費部署指南

## 🎯 為什麼選擇 Vercel？
- ✅ **完全免費** - 不需要付費方案
- ✅ **Serverless Functions** - 內建後端 API 支援
- ✅ **全球 CDN** - 自動優化速度
- ✅ **自動部署** - 連接 GitHub 後自動更新

---

## 🚀 部署步驟（5分鐘）

### 1. 安裝 Vercel CLI
```powershell
npm install -g vercel
```

### 2. 登入 Vercel
```powershell
cd c:\Users\huach\Downloads\Code\kcis-connect-main\kcis-connect-main
vercel login
```

### 3. 設定環境變數
```powershell
# 設定 KKBOX Client ID
vercel env add KKBOX_CLIENT_ID
# 輸入: 58dff52bea1298c549b6a9a44fd91610

# 設定 KKBOX Client Secret
vercel env add KKBOX_CLIENT_SECRET
# 輸入: ac1271e37d61676b67722d29e671039a
```

### 4. 部署到 Vercel
```powershell
vercel --prod
```

### 5. 更新前端配置
部署完成後，你會得到網址（例如：`https://your-app.vercel.app`）

更新 `.env`:
```
VITE_KKBOX_PROXY_URL=https://your-app.vercel.app/api
```

### 6. 重新建置
```powershell
npm run build
```

再次部署（如果用 Vercel 託管前端）:
```powershell
vercel --prod
```

---

## 📂 檔案結構

```
kcis-connect-main/
├── api/                      # Vercel Serverless Functions
│   ├── kkboxSearch.js       # 搜尋歌曲
│   └── kkboxTrack.js        # 取得歌曲詳情
├── src/                      # 前端程式碼
├── vercel.json               # Vercel 設定
└── .env                      # 環境變數
```

---

## 🌐 API 端點

部署後，你的 API 會在：
- `https://your-app.vercel.app/api/kkboxSearch?q=歌名`
- `https://your-app.vercel.app/api/kkboxTrack?id=track_id`

---

## 💡 其他免費選項

### Netlify Functions（替代方案）
```powershell
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Cloudflare Workers（進階）
- 更快的全球部署
- 每天 10 萬次請求免費

---

## ✅ 優勢比較

| 方案 | 免費額度 | 速度 | 設定難度 |
|------|---------|------|---------|
| Vercel | 100GB 流量/月 | ⭐⭐⭐⭐⭐ | 簡單 |
| Netlify | 100GB 流量/月 | ⭐⭐⭐⭐ | 簡單 |
| Firebase (Blaze) | 需付費 | ⭐⭐⭐⭐ | 中等 |

---

## 🎉 完成！

使用 Vercel 後：
- ✅ 不需要付費方案
- ✅ KKBOX CORS 問題解決
- ✅ 全球 CDN 加速
- ✅ 自動 HTTPS

**推薦使用 Vercel！** 🚀
