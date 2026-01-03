# Vercel 只部署 API（前端繼續用 Firebase）

## 🎯 策略
- **前端**: Firebase Hosting（保持原網址）
- **API**: Vercel Serverless Functions（免費後端）

這樣你的網址 `kcismedia-3ad38.web.app` 不用改！

---

## 🚀 快速部署（3 步驟）

### 1. 部署 API 到 Vercel
```powershell
cd c:\Users\huach\Downloads\Code\kcis-connect-main\kcis-connect-main

# 登入 Vercel
vercel login

# 部署（只部署 API）
vercel --prod
```

部署完成會得到 API 網址，例如：
```
https://kcis-connect-main-xxx.vercel.app
```

### 2. 更新 .env
把 Vercel API 網址填入：
```
VITE_KKBOX_PROXY_URL=https://kcis-connect-main-xxx.vercel.app/api
```

### 3. 重新建置並部署到 Firebase
```powershell
npm run build
firebase deploy --only hosting
```

---

## ✅ 完成！

你的網址保持不變：
- 前端: `https://kcismedia-3ad38.web.app` ✅
- API: `https://kcis-connect-main-xxx.vercel.app/api` (背後呼叫)

用戶完全無感知！🎉

---

## 📝 說明

Vercel 配置已經簡化，只部署 `api/` 目錄：
- ✅ 不會建置前端
- ✅ 只有 serverless functions
- ✅ 環境變數已內建（KKBOX 憑證）

Firebase Hosting 繼續負責前端，API 請求會自動轉到 Vercel。
