# Admin Control Panel - Comprehensive Features

## 已實現的功能

### 1. 用戶管理 (User Management)
- **用戶列表**: 查看所有註冊用戶及其信息
- **角色管理**: 變更用戶角色 (Student, Teacher, Official, Administrator)
- **用戶禁用**: 禁止用戶登錄 (Ban users)
- **用戶刪除**: 刪除用戶及其所有內容

### 2. Post 編輯 (Post Editing)
- **Admin 可編輯任何 Post**: 管理員可以編輯任何人的 Post
- **Post 所有者可編輯**: 用戶可以編輯自己的 Post
- **編輯審計**: 被管理員編輯的 Post 會標記 `editedByAdmin`
- **實時更新**: 編輯後立即同步到數據庫

### 3. 舉報系統 (Report System)
- **舉報內容**: 用戶可以舉報 Post、用戶或評論
- **舉報原因**: 不當內容、騷擾、垃圾、錯誤信息、其他
- **舉報管理**: Admin 可以查看所有待處理舉報
- **舉報處理**: 
  - 標記為調查中 (Investigating)
  - 標記為已解決 (Resolved)
  - 標記為駁回 (Dismissed)
- **解決備註**: Admin 可以為處理添加備註

### 4. 活動日誌 (Activity Logging)
- **自動記錄**: 系統自動記錄所有關鍵操作
- **活動類型**: 用戶登錄、Post 創建、編輯、刪除、舉報等
- **時間戳**: 每個活動都有精確的時間戳
- **監視儀表板**: 在 Admin Panel 中查看最近 50 條活動日誌

### 5. Admin Panel 增強功能
- **Overview 選項卡**: 顯示平台統計信息
  - 總用戶數
  - 總 Post 數
  - 待處理舉報數
  - 活動日誌數
- **User Management 選項卡**: 
  - 列出所有用戶
  - 快速角色變更
  - 禁用/刪除用戶按鈕
- **Reports 選項卡**:
  - 查看所有舉報
  - 調查/解決/駁回按鈕
  - 舉報詳情和備註
- **Activity Log 選項卡**:
  - 實時活動監視
  - 操作類型和目標信息
  - 時間戳和用戶信息
- **Help Requests 選項卡**:
  - 待處理求助請求
  - 進行中的請求
  - 已解決的請求

## 後端 Firestore 函數

### 新增函數

#### `editPost(postId, userId, updates)`
- 允許 Admin 編輯任何 Post
- 允許所有者編輯自己的 Post
- 參數: `content`, `images`

#### `createReport(type, targetId, reportedBy, reason, description, targetAuthorId)`
- 創建舉報記錄
- `type`: 'post', 'user', 'comment'
- `reason`: 'inappropriate-content', 'harassment', 'spam', 'misinformation', 'other'

#### `updateReportStatus(reportId, status, adminId, notes)`
- 更新舉報狀態
- `status`: 'investigating', 'resolved', 'dismissed'

#### `logActivity(userId, description, targetType, targetId)`
- 記錄用戶活動
- 自動調用各種操作中

#### `updateUserStatus(userId, adminId, status)`
- 更改用戶狀態
- `status`: 'active', 'banned', 'suspended'

#### `deleteUser(userId, adminId)`
- 刪除用戶及其所有 Post
- 需要 Admin 權限

#### `getReports(status)`
- 獲取舉報列表
- 支持按狀態篩選

#### `getActivityLogs(limit)`
- 獲取活動日誌
- 默認返回最近 100 條

## 數據模型

### Report 類型
```typescript
interface Report {
  id: string;
  type: 'post' | 'user' | 'comment';
  targetId: string;
  reportedBy: string;
  reason: string;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}
```

### ActivityLog 類型
```typescript
interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  description?: string;
  createdAt: Date;
}
```

## 權限模型

### Admin (管理員)
- ✅ 可以編輯所有 Post
- ✅ 可以刪除所有 Post
- ✅ 可以刪除/禁用/編輯任何用戶
- ✅ 可以查看和處理所有舉報
- ✅ 可以訪問完整的活動日誌
- ✅ 可以管理所有社團

### Teacher (教師)
- ✅ 可以編輯自己的 Post
- ✅ 可以刪除自己的 Post 和學生的 Post
- ✅ 可以批准社團
- ❌ 不能編輯用戶信息

### Official (官方)
- ✅ 可以編輯自己的 Post
- ✅ 可以刪除自己的 Post
- ❌ 不能編輯他人內容

### Student (學生)
- ✅ 可以編輯自己的 Post
- ✅ 可以刪除自己的 Post
- ❌ 不能編輯他人內容

## Firestore Collections

### reports
```
reports/{reportId}
├── type: string
├── targetId: string
├── targetAuthorId?: string
├── reportedBy: string
├── reason: string
├── description: string
├── status: string
├── createdAt: Timestamp
├── resolvedAt?: Timestamp
├── resolvedBy?: string
└── resolutionNotes?: string
```

### activityLogs
```
activityLogs/{logId}
├── userId: string
├── action: string
├── targetType?: string
├── targetId?: string
├── description?: string
└── createdAt: Timestamp
```

## 使用示例

### 舉報一個 Post
```typescript
await createReport(
  'post',
  'postId123',
  currentUserId,
  'inappropriate-content',
  'This post contains offensive language'
);
```

### Admin 編輯 Post
```typescript
await editPost(postId, adminId, {
  content: 'Edited content by admin'
});
```

### 禁止用戶
```typescript
await updateUserStatus(userId, adminId, 'banned');
```

### 查看待處理舉報
```typescript
const reports = await getReports('pending');
```

### 處理舉報
```typescript
await updateReportStatus(
  reportId,
  'resolved',
  adminId,
  'Post violates community guidelines. Deleted.'
);
```

## 部署信息

- **部署日期**: $(date)
- **版本**: v2.0 (Admin Controls)
- **托管 URL**: https://kcismedia-3ad38.web.app
- **GitHub**: https://github.com/Superior-curtis/kcisocial

## 後續改進建議

1. **批量操作**: 支持批量刪除用戶或 Post
2. **搜索和篩選**: 在舉報和活動日誌中添加高級搜索
3. **分析儀表板**: 更詳細的統計和趨勢分析
4. **審計跟蹤**: 更詳細的 Admin 操作日誌
5. **自動化規則**: 設置自動舉報處理規則
6. **用戶分析**: 用戶行為和交互分析
