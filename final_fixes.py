#!/usr/bin/env python3
import re

print("Fixing Chat.tsx video size limits...")
with open('src/pages/Chat.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '''    if (file.size > 20 * 1024 * 1024) {
      alert("File too large (max 20MB)");
      return;
    }'''

new_code = '''    const maxSize = isVideo ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(isVideo ? "Video too large (max 5MB)" : "File too large (max 20MB)");
      return;
    }'''

content = content.replace(old_code, new_code)

with open('src/pages/Chat.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Chat.tsx updated")

# Also check if appTheme is being read from listenToUserProfile
print("\nChecking listenToUserProfile for appTheme...")
with open('src/lib/firestore.ts', 'r', encoding='utf-8') as f:
    firestore_content = f.read()

if 'const user = toUser(uid, docSnap.data() as UserRecord)' in firestore_content:
    print("✓ listenToUserProfile uses toUser which maps appTheme")
else:
    print("⚠ listenToUserProfile might not be mapping appTheme properly")

print("\nAll fixes applied!")
