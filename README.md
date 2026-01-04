# Campus Media (Test)

Campus Media 是一個「學生自製、僅供測試」的社群網站專案（React + Firebase）。

**新網站（主要使用）：** https://campusmedia-01.web.app

**舊網站：** https://kcismedia-3ad38.web.app （已切換為維護頁，提供跳轉按鈕到新網站）

> Disclaimer / 免責聲明：僅供測試用途，並非學校官方網站。

---

## 1) 這個專案在做什麼

這個 repo 是一個前端 SPA（React + Vite），後端主要使用 Firebase：

- **Firebase Auth**：Google 登入
- **Firestore**：貼文/留言/聊天室/通知/社團/音樂房間共享狀態
- **Firebase Hosting**：部署

它的目標是：在不做傳統後端 server 的情況下，做出一套可用的社群功能，並加上一些即時同步能力（例如 Music Room）。

---

## 2) 主要功能（詳細版）

以下以「使用者能做什麼」的角度描述，並補充內部大概怎麼做。

### 2.1 登入 / Auth

- **Google Sign-In**：使用 Firebase Auth 的 Google provider
- **未登入保護**：需要登入才能進入主要頁面（未登入會被導向 `/auth`）
- **測試免責文字**：`/auth` 頁面顯示「僅供測試用途，並非學校官方網站」

為什麼要「導向 `/auth`」而不是直接 render 一個 Auth component：
- 這能避免「看起來像兩個一樣的頁面」或「網址不一致造成混亂」

### 2.2 貼文系統 / Feed + Posts

- **發文**：文字 +（依功能版本）圖片/影片/GIF
- **互動**：按讚、留言、收藏
- **個人貼文牆**：在 profile 看到自己的貼文與收藏

資料大多走 Firestore：
- 貼文/留言屬於典型的「多讀少寫」資料模型
- UI 會盡量減少不必要的輪詢與重複訂閱，避免 Firestore 額度暴衝

### 2.3 聊天 / Messages

- **私人聊天**：一對一對話
- **訊息列表**：最近對話、未讀等（依功能版本）
- **即時更新**：Firestore onSnapshot 監聽

注意：即時監聽非常方便，但也很容易讓 Firestore read 數量上升。
實務上會需要：
- 限制訂閱範圍（例如只訂閱最近 N 則）
- 避免在同一畫面訂閱太多 collection

### 2.4 個人檔案 / Profile

- **頭像、暱稱、個人資訊**
- **封面背景**：目前預設使用 `/roadimg.png`
- **UserProfile 公開頁**：查看其他使用者資料

### 2.5 社團 / Clubs

- 建立社團（依權限/版本而定）
- 社團公告、社團頁面
- 社團相關貼文/互動

### 2.6 通知 / Notifications

- 被按讚/被留言/被追蹤/新訊息等通知（依功能版本）
- 透過 Firestore 建模並在 UI 做即時更新

### 2.7 Music Room（同步播放）

Music Room 是這個專案最「非典型 CRUD」的部分：

- **房間共享狀態**：播放/暫停、目前曲目、進度、主持人（host）
- **多人同步**：聽眾端會根據共享狀態校正自己的播放
- **降低寫入**：避免每 1 秒寫一次 Firestore（會爆額度）

我們採用的核心概念：
- Firestore 只存「關鍵狀態（state）」與「時間基準（例如 host 端的開始時間戳）」
- 客戶端用本機時鐘推算「現在應該播放到哪」
- 只有在狀態真正改變（換歌、播放/暫停、seek）時才寫入

### 2.8（可選）VoIP / Call（如果你的版本有開）

repo 內有 VoIP 相關元件與 service（依你實際部署是否啟用）。
這類功能通常會遇到：
- P2P 連線品質
- 音視訊同步
- call 結束與清理狀態

---

## 3) 技術架構（給維護者看的）

### 3.1 前端

- React + TypeScript
- Vite 打包
- Tailwind + shadcn/ui
- React Router

### 3.2 Firebase

- Firestore：主要資料庫
- Auth：登入
- Hosting：部署 SPA（rewrites 到 `/index.html`）

---

## 4) 部署與站點策略（新站 / 舊站）

目前有兩個 Firebase Hosting：

- **新站（主要）**：`campusmedia-01`
- **舊站（已退役）**：`kcismedia-3ad38`

舊站「為什麼不能登入」：
- 舊站曾經對應不同的 Firebase project。當我們把主要開發/資料/部署切換到新 project 後，舊站如果仍然跑原本 app，就會遇到「Auth/Firestore 指向不同 project」導致登入行為失效或資料不一致。

因此我們採取更乾淨的做法：
- **舊站直接改成 Maintenance 靜態頁**
- 頁面上提供按鈕導向新站，避免使用者卡在舊系統

舊站維護頁來源與設定：
- 維護頁：`maintenance-dist/index.html`
- 舊站 deploy config：`firebase.old.json`

---

## 5) 開發環境設定（Local）

### 5.1 必要條件

- Node.js 18+
- npm
- Firebase CLI（可用 `npx -y firebase-tools`）

### 5.2 環境變數

使用 `.env.example` 當模板，複製成 `.env`：

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

注意：
- `.env` 已被 git ignore，避免把本機設定推上 GitHub。

### 5.3 指令

```bash
npm install
npm run dev
```

---

## 6) 部署指令（最常用）

### 6.1 Build

```bash
npm run build
```

### 6.2 部署新站（主要）

```bash
npx -y firebase-tools deploy --only hosting --project campusmedia-01
```

### 6.3 部署舊站（維護頁）

```bash
npx -y firebase-tools deploy --only hosting --project kcismedia-3ad38 --config firebase.old.json
```

---

## 7) 我們在開發/部署過程中遇到的問題 & 怎麼解

這一段是「真實踩坑筆記」，讓之後接手的人知道為什麼現在長這樣。

### 7.1 Firestore 額度爆掉（讀/寫過多）

現象：
- 同步類功能（尤其是 Music Room）如果每秒寫入/多處訂閱，會快速耗盡免費額度或導致成本上升。

處理方式：
- Firestore 只存「狀態變更事件」與「時間基準」，不要存每秒進度
- 減少不必要的 onSnapshot 訂閱範圍
- 合併/去抖（debounce）一些非必要更新

### 7.2 房間 doc ID 不一致 → 同步失效

現象：
- 多裝置加入同一個房間，但各自更新到不同的 document，導致「大家看起來都在更新，但其實不同步」。

處理方式：
- 讓房間 document ID 有明確規則（canonical ID），所有 client 都用同一個

### 7.3 service 程式碼破損/重複邏輯 → 行為不穩

現象：
- 早期迭代過程中，某些同步 service 曾出現重複/破損內容，導致狀態更新混亂。

處理方式：
- 將同步邏輯集中、整理成「單一資料流」
- 減少互相呼叫、彼此覆蓋的寫入

### 7.4 未登入頁面看起來像「兩個一樣的頁」

現象：
- 在 protected route 內直接 render `<Auth />`，導致使用者看到內容像 `/auth`，但網址不是 `/auth`。

處理方式：
- 統一改成 redirect/navigate 到 `/auth`

### 7.5 Firebase project 遷移（舊 project → 新 project）

現象：
- 更換 Firebase project 後：Auth、Firestore、Hosting、規則與資料都需要對應。
- 若「網站還指向舊 project」會出現登入/資料錯亂。

處理方式：
- 主站全面切到 `campusmedia-01`
- 舊站 `kcismedia-3ad38` 改為 maintenance 靜態頁，避免錯誤登入

---

## 8) 目前限制（Limitations）

這些不是 bug，而是目前設計/資源下的客觀限制：

1) **Firestore 成本與即時性取捨**
	- 即時監聽很方便，但訂閱越多，read 越多
	- Music Room 這類同步功能需要嚴格控制寫入頻率

2) **同步播放的完美一致性很難**
	- 不同裝置、不同網路延遲、背景播放限制，都可能造成 drift
	- 只能做「可接受的同步」，並用校正策略改善

3) **第三方服務依賴**
	- 例如 OpenAI / Cloudinary（若啟用）會受 API key/配額影響

4) **權限/管理功能仍需持續強化**
	- 社群產品的核心是 moderation、濫用防護、權限模型
	- 目前多數依賴 Firestore rules + 基本 UI 邏輯

5) **iOS/原生打包（若要做）仍需要額外工程量**
	- 需要處理 PWA/Capacitor、推播、原生權限、App Store 流程

---

## 9) 心得與感想（給未來的我們）

- **同步功能不是「寫個 onSnapshot 就好」**：要設計狀態模型、時間基準、寫入策略與防抖。
- **Firebase 很快，但也很容易被用爆**：一開始就要把「讀寫數量」當成第一級限制。
- **部署策略要清楚**：新舊站同時存在時，最好讓舊站退役成引導頁，避免兩套系統互相干擾。
- **可維護性比短期 patch 更重要**：把 service 整理乾淨，比到處修 if 更省時間。

---

## 10) Contributing

如果你要繼續開發：

- 請避免提交 `.env`
- 大改同步/Firestore 訂閱前，先想清楚讀寫成本
- 提交 PR 前跑一次 `npm run build`

