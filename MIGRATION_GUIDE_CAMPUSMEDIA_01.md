# Migration Guide (C): Firestore + Auth + Storage

Target Firebase project: `campusmedia-01`
Source Firebase project: `kcismedia-3ad38`

This guide migrates **all data** in the practical sense:
- Firestore documents
- Firebase Authentication users
- Cloud Storage objects

> Important: If the source project is currently hitting `resource-exhausted` quotas, you may need to **wait for quota reset** or **upgrade billing** on the source project to complete export steps.

---

## 0) Prerequisites

### Install tooling (Windows)
- Node.js + npm
- Google Cloud SDK (`gcloud`) which includes `gsutil`
  - Install: https://cloud.google.com/sdk/docs/install

### Login
```powershell
# Firebase CLI via npx (no global install required)
npx -y firebase-tools login

# Google Cloud SDK auth
# (this is used for Firestore export/import + Storage rsync)
gcloud auth login

gcloud auth application-default login
```

### Confirm project access
You need permissions on BOTH projects.

Typical minimum roles:
- Firestore export/import:
  - `roles/datastore.importExportAdmin` (or equivalent)
  - `roles/storage.admin` on the GCS bucket used for backups
- Auth export/import:
  - Firebase Auth admin privileges on the project
- Storage rsync:
  - `roles/storage.admin` on both buckets

---

## 1) Firestore: Export from old → Import to new

Firestore “full copy” is best done via **server-side export/import**.

### 1.1 Create / choose a GCS bucket for backups
You can create a bucket under the **new** project (recommended), then grant the old project export permission to write into it.

Example bucket name (choose your own):
- `gs://campusmedia-01-migration-backups`

Create bucket (example):
```powershell
# pick a region close to you
$BUCKET="campusmedia-01-migration-backups"
$REGION="asia-east1"

gsutil mb -p campusmedia-01 -l $REGION gs://$BUCKET
```

### 1.2 Export Firestore from old project
```powershell
$BUCKET="campusmedia-01-migration-backups"
$STAMP=(Get-Date).ToString('yyyyMMdd-HHmmss')
$EXPORT_PATH="gs://$BUCKET/firestore-export-$STAMP"

gcloud firestore export $EXPORT_PATH --project=kcismedia-3ad38
```

### 1.3 Import Firestore into new project
```powershell
# Use the exact EXPORT_PATH produced above
gcloud firestore import $EXPORT_PATH --project=campusmedia-01
```

---

## 2) Auth: Export users from old → Import users to new

### 2.1 Export users
```powershell
npx -y firebase-tools auth:export .\auth-users.json --project kcismedia-3ad38
```

### 2.2 Import users
```powershell
npx -y firebase-tools auth:import .\auth-users.json --project campusmedia-01
```

### Critical limitation (Email/Password accounts)
Firebase **does not export password hashes** for Email/Password users.
- If your app has Email/Password users, you typically cannot migrate their passwords.
- Workarounds:
  - Move to Google-only sign-in
  - Force password reset emails on the new project
  - Use a custom auth migration strategy (advanced)

Google sign-in users usually migrate fine.

---

## 3) Storage: Copy objects from old bucket → new bucket

### 3.1 Identify bucket names
Old bucket (from config):
- `kcismedia-3ad38.firebasestorage.app`

New bucket:
- `campusmedia-01.firebasestorage.app`

### 3.2 Run rsync
```powershell
$OLD="gs://kcismedia-3ad38.firebasestorage.app"
$NEW="gs://campusmedia-01.firebasestorage.app"

gsutil -m rsync -r $OLD $NEW
```

---

## 4) Rules / Indexes

After importing, deploy your Firestore rules + indexes to the new project:
```powershell
# From the repo root
npx -y firebase-tools deploy --only firestore --project campusmedia-01
```

---

## 5) Verify

- Open Firestore console for `campusmedia-01`:
  - Check key collections exist (e.g. `users`, `clubs`, `posts`, `music_rooms`)
- Open Auth console:
  - Confirm user count and provider breakdown
- Open Storage:
  - Confirm files appear

---

## Notes for your current app

This repo has already been switched to use `campusmedia-01` at runtime and deployed to Hosting:
- https://campusmedia-01.web.app

If you finish the migration steps above, the app should immediately start showing your original data again (on the new project).