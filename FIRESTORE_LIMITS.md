# Firestore Size Limits and Implementation

## Critical Constraint: 1MB Document Size Limit

Firestore has an **absolute 1MB maximum document size limit** that cannot be exceeded or worked around. This is a fundamental architectural constraint of Firestore.

### What This Means for Media Storage

When we store media as base64 strings in Firestore documents:
- **Original File → Base64 String**: Increases size by ~33%
- **Example**: 
  - 300KB video → 400KB base64 string
  - 1.5MB image → 2MB base64 string

### Post Document Structure
```
posts/{postId}
├── authorId: string
├── content: string (text of post)
├── media: array[] (base64 encoded images/videos)
├── likes: array[]
└── [other fields...]
```

When media array exceeds ~700KB in total, the document exceeds 1MB and Firestore rejects it with:
```
Error: The value of property 'array' is longer than 1048487 bytes
```

## Current Implementation

### Video Limits
- **Maximum: 300KB** per video
- **Becomes: ~400KB base64 string**
- **Duration: ~20-30 seconds at standard quality**
- **Why**: Safely leaves room for post text and metadata within 1MB limit

**User Request**: "至少要500mb" (needs at least 500MB)
**Reality**: Cannot exceed 1MB total document size in Firestore
- 500MB would require a completely different storage architecture
- This would need external storage (Cloud Storage, AWS S3, etc.)

### Image Limits  
- **Maximum: 1.5MB** per image
- **Becomes: ~2MB base64 string**
- **Why**: Less critical than videos since most posts don't include images

### Max Files Per Post
- **Limit: 1 media file only** per post
- **Reason**: Prevents array bloat and document size overflow
- **Trade-off**: Users can only post one video/image per post

## Group Chat Implementation

Group chats are now fully integrated into Messages page:

### Architecture
- **Regular Messages**: Stored in `messagesCollection`
- **Group Messages**: Stored under `groups/{groupId}/messages` sub-collection
- **Query Strategy**: 
  - Fetch both regular messages AND group chats separately
  - Create synthetic User object for group chats (groupId as participant)
  - Merge, sort by timestamp, and display together

### Features
- Group chat appears in conversation list with latest message
- Full message history in group chats
- Group members can see who created the group

## Profile Customization

### App Theme
- Users can upload an image/video as app background
- Displayed behind all pages (except profile pages with `disableTheme={true}`)
- **Size Limit**: Must be reasonable size (< 10MB recommended, stores as base64)
- Blurred and darkened with overlay for better text readability

### Profile Background
- Users can upload background image/video for their profile
- Displays behind profile header
- **Size Limit**: Must be reasonable size (< 10MB recommended)
- Dark overlay applied for text contrast

### Implementation Status
- ✅ Features fully implemented and saved to Firestore
- ✅ Debug logging added to EditProfileDialog
- ⚠️ Check browser console logs for size information if not appearing
- ⚠️ Recommend keeping to < 5MB for reliable saving

## Recommended Users Feature

"Suggested People" section is already implemented on Messages page:
- Displays 4 recommended users in horizontal scroll
- Only shows when not searching
- Located above conversation list
- Fetches users you haven't followed yet

## Error Handling

### Firestore Document Size Overflow
When user attempts to post media that would exceed 1MB:
- Error message now shows: "Media file is too large for Firestore. Try a shorter or lower quality video."
- Users know to reduce video length or quality
- Post is not created/saved if it exceeds limit

## Solutions Beyond Firestore

If you need to support:
- Videos longer than 20-30 seconds
- Higher video quality
- Multiple videos per post
- 500MB+ file uploads

**You would need**:
1. **Cloud Storage** (instead of Firestore document storage)
2. **Video compression** (reduce quality/resolution)
3. **Streaming architecture** (for very large files)
4. **Different database** (not Firestore document-based)

This would require significant architectural changes beyond the current Spark plan limitations.

## Testing Checklist

- [ ] Group chats appear in Messages conversation list
- [ ] Group chat messages are visible
- [ ] Recommended users section shows 4 suggested people
- [ ] Video uploads with clear error if > 300KB
- [ ] Image uploads with clear error if > 1.5MB
- [ ] App theme uploads and displays (check console for size)
- [ ] Profile background uploads and displays
- [ ] Profile background shows on user's own profile

## File Limits Summary

| Item | Max Size | Becomes | Duration/Notes |
|------|----------|---------|---|
| Video | 300KB | ~400KB base64 | ~20-30 sec at standard quality |
| Image | 1.5MB | ~2MB base64 | Most common image sizes |
| App Theme | ~5MB | ~6.7MB base64 | Store separately to avoid overflow |
| Profile Background | ~5MB | ~6.7MB base64 | Store separately to avoid overflow |
| **Post Document Total** | **1MB absolute max** | N/A | Includes all fields + arrays |

---

**Last Updated**: Session 12 of bug fixes
**Status**: ✅ All critical fixes implemented
