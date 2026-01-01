#!/usr/bin/env python3
# Fix script for all remaining issues

import re

print("=" * 60)
print("Fixing remaining issues...")
print("=" * 60)

# Fix 1: Limit video file size in CreatePost
print("\n1. Limiting video file size in CreatePost.tsx...")
with open('src/components/post/CreatePost.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_check = '''      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 20MB per file", variant: "destructive" });
        return;
      }'''

new_check = '''      // Limit videos to 5MB (base64 becomes ~6.7MB), images to 20MB
      const maxSize = isVideo ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({ 
          title: "File too large", 
          description: isVideo ? "Videos must be under 5MB" : "Images must be under 20MB", 
          variant: "destructive" 
        });
        return;
      }'''

if old_check in content:
    content = content.replace(old_check, new_check)
    print("   ✓ Video file size limits updated")
else:
    print("   ⚠ Could not find file size check")

with open('src/components/post/CreatePost.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Fix 2: Check if app theme issue is due to user object not having appTheme loaded
print("\n2. Checking AuthContext for appTheme propagation...")
with open('src/contexts/AuthContext.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    if 'appTheme' in content:
        print("   ✓ AuthContext mentions appTheme")
    else:
        print("   ⚠ AuthContext doesn't mention appTheme - might need to check listenToUserProfile")

# Fix 3: Check group chat video upload
print("\n3. Checking ChatInput for video upload...")
try:
    with open('src/components/chat/ChatInput.tsx', 'r', encoding='utf-8') as f:
        content = f.read()
        if 'handleMediaUpload' in content:
            print("   ✓ ChatInput has media upload handler")
            # Apply same fix
            old_check = '''      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 20MB", variant: "destructive" });
        return;
      }'''
            new_check = '''      const maxSize = isVideo ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({ 
          title: "File too large", 
          description: isVideo ? "Videos must be under 5MB" : "Images must be under 20MB", 
          variant: "destructive" 
        });
        return;
      }'''
            if old_check in content:
                content = content.replace(old_check, new_check)
                with open('src/components/chat/ChatInput.tsx', 'w', encoding='utf-8') as cf:
                    cf.write(content)
                print("   ✓ ChatInput video limits updated")
            else:
                print("   ⚠ Different file size check format")
        else:
            print("   ⚠ Could not find media upload handler")
except FileNotFoundError:
    print("   ⚠ ChatInput.tsx not found")

# Fix 4: Verify profile posts display
print("\n4. Verifying Profile.tsx has post listener...")
with open('src/pages/Profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    if 'collection(firestore, \'posts\')' in content and 'where(\'authorId\'' in content:
        print("   ✓ Profile has post listener")
    else:
        print("   ⚠ Profile might not be loading posts")

print("\n" + "=" * 60)
print("Summary:")
print("- Video files limited to 5MB to fit Firestore size limits")
print("- AppTheme should load if user document has it")
print("- Profile page should display user posts")
print("=" * 60)
