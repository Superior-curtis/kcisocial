# Admin Account Setup

## Creating Admin Account for huachen0625@gmail.com

After the user logs in with huachen0625@gmail.com for the first time, follow these steps to grant admin privileges:

### Option 1: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/project/kcismedia-3ad38/firestore)
2. Navigate to Firestore Database → users collection
3. Find the user document with email "huachen0625@gmail.com"
4. Click on the document
5. Edit the `role` field and change it to `"admin"`
6. Save the changes

### Option 2: Using Firebase CLI

After the user logs in once, you can use Firebase CLI:

```bash
# First, get the user's UID from Firestore or Authentication console
# Then run:
firebase firestore:set users/{USER_UID} '{"role":"admin"}' --merge --project kcismedia-3ad38
```

Replace `{USER_UID}` with the actual UID from the Firebase Authentication panel.

### Option 3: Programmatically (Future Enhancement)

You can add a Cloud Function or admin API endpoint that:
1. Verifies the requester is already an admin
2. Updates another user's role to admin

## Verifying Admin Access

After updating the role:
1. User needs to log out and log in again
2. The app will load the new role from Firestore
3. Admin-only features will become available

## Admin Privileges

With admin role, the user can:
- Create official announcements
- Manage clubs and user content
- Access admin-only features in the UI
