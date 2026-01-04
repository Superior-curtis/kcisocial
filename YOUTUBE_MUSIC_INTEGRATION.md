# 🎬 YouTube Music Integration - Discord Bot Style

## 功能特色

### ✅ 完成的改進

1. **YouTube 完整音樂播放**
   - 像 Discord bot 一樣搜尋並播放 YouTube 完整音樂
   - 嵌入式 YouTube 播放器直接在網頁播放
   - 不再限制於 30 秒預覽！

2. **雙音樂來源**
   - 🎬 **YouTube**: 完整歌曲 (推薦!)
   - 🎵 **KKBOX**: 30秒預覽 + iTunes

3. **自動刪除修正**
   - 當房間沒有聽眾時自動刪除
   - 加入詳細的 console.log 追蹤
   - 修正雙重過濾 bug

4. **UI 改進**
   - 增加間距讓版面更舒適
   - YouTube/KKBOX 標籤切換
   - 視覺化標示哪些是完整歌曲

## 使用方法

### 搜尋完整音樂

1. 進入音樂房間
2. 點選 **"🎬 YouTube (Full Songs)"** 標籤
3. 輸入歌曲名稱或藝人名稱
4. 點選搜尋結果右側的 **"+"** 按鈕加入播放列表

### 播放控制

- **播放/暫停**: 只有房間創建者可以控制
- **跳過**: 跳到下一首歌
- **重複模式**: 單曲重複或列表重複
- **音量控制**: 每個用戶可以調整自己的音量

### YouTube API Key (選擇性)

**目前狀態**: 使用 fallback 模式，會創建 YouTube 搜尋連結

**如果想要直接搜尋結果**:

1. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 啟用 **YouTube Data API v3**
3. 創建 API Key
4. 在 `.env` 檔案加入:
   ```
   VITE_YOUTUBE_API_KEY=你的API金鑰
   ```

## 技術架構

### 新增檔案

- **`src/services/youtubeService.ts`**: YouTube 搜尋和嵌入服務
  - `searchMusic()`: 搜尋 YouTube 音樂
  - `getEmbedUrl()`: 生成嵌入式播放器 URL
  - `extractVideoId()`: 從各種 YouTube URL 格式提取影片 ID

### 修改檔案

1. **`src/services/syncMusicService.ts`**
   - 新增 `youtubeUrl`, `youtubeId`, `youtubeEmbed` 到 `MusicTrack` interface
   - 改進 `leaveRoom()` 加入詳細日誌
   - 新增 `resetState()` 方法

2. **`src/components/MusicRoom.tsx`**
   - 加入 YouTube 標籤切換
   - 嵌入式 YouTube 播放器
   - 雙來源搜尋結果顯示

## 偵錯

### 查看房間刪除日誌

打開瀏覽器 Console (F12) 查看:

```
[SyncMusic] User xxx leaving room xxx
[SyncMusic] Listeners before: 2, after: 1
[SyncMusic] Updated listeners list
```

或者當房間被刪除:

```
🗑️ [SyncMusic] Room deleted - no listeners left
```

### 常見問題

**Q: 為什麼搜尋 YouTube 沒有結果？**
A: 目前使用 fallback 模式，會顯示 YouTube 搜尋連結。如需直接搜尋，請設定 YouTube API Key。

**Q: YouTube 影片無法播放？**
A: 某些影片有嵌入限制。建議搜尋官方音頻頻道 (如 "Vevo", "Official Audio")。

**Q: 房間沒有自動刪除？**
A: 檢查瀏覽器 Console，確保看到 "[SyncMusic] User xxx leaving room" 訊息。

## 部署

```bash
# 建構專案
npm run build

# 部署到 Firebase
firebase deploy --only hosting
```

## 未來改進

- [ ] YouTube 播放進度同步 (目前只有預覽音樂同步)
- [ ] YouTube 播放列表支援
- [ ] 自動播放下一首 (YouTube iframe API)
- [ ] 歌詞顯示整合

---

**享受完整的音樂體驗！🎵**
