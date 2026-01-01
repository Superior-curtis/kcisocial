#!/usr/bin/env python3
import re

# Fix 1: Add minHeight to profile background (Profile.tsx)
print("Fixing profile background size...")
with open('src/pages/Profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the profile background style
pattern = r"(filter: \"blur\(8px\)\",\s+transform: \"scale\(1\.1\)\",)\s+(\}\})"
replacement = r'\1\n                minHeight: "300px",\n              \2'
content = re.sub(pattern, replacement, content)

with open('src/pages/Profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("✓ Profile background fixed")

# Fix 2: Debug app theme in AppLayout
print("\nChecking app theme in AppLayout...")
with open('src/components/layout/AppLayout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    if 'user?.appTheme' in content:
        print("✓ AppLayout has appTheme check")
    else:
        print("⚠ appTheme not found in AppLayout")

# Fix 3: Check CreatePost video upload
print("\nChecking CreatePost video delay...")
with open('src/components/post/CreatePost.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    if 'new Promise(resolve => setTimeout(resolve, 1000))' in content:
        print("✓ Video upload delay present")
    else:
        print("⚠ Video upload delay NOT found")

# Fix 4: Check Profile buttons visibility
print("\nChecking Profile action buttons...")
with open('src/pages/Profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    if 'Edit Profile' in content and 'onClick={() => setEditDialogOpen(true)}' in content:
        print("✓ Edit Profile button present")
    else:
        print("⚠ Edit Profile button NOT found")

print("\nDone!")
