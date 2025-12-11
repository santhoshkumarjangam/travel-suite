# GCS Service Account Setup Guide

## Step 1: Create GCS Bucket

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **Cloud Storage** → **Buckets**
3. Click **Create Bucket**
4. Settings:
   - **Name**: `galleriq-media` (or your preferred name)
   - **Location type**: Region
   - **Location**: `us-central1` (or nearest to you)
   - **Storage class**: Standard
   - **Access control**: Fine-grained (Uniform is also OK)
5. Click **Create**

## Step 2: Make Bucket Public (for public URL access)

```bash
# Using gsutil CLI
gsutil iam ch allUsers:objectViewer gs://galleriq-media

# Or in Console:
# Go to bucket → Permissions → Add Principal
# Principal: allUsers
# Role: Storage Object Viewer
```

## Step 3: Enable CORS (for frontend uploads)

Create a file `cors.json`:
```json
[
  {
    "origin": ["http://localhost:5173", "https://yourdomain.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS:
```bash
gsutil cors set cors.json gs://galleriq-media
```

## Step 4: Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Details:
   - **Name**: `galleriq-backend`
   - **Description**: "Backend service for Galleriq photo uploads"
4. Click **Create and Continue**
5. Grant role: **Storage Object Admin**
6. Click **Continue** → **Done**

## Step 5: Create JSON Key

1. Find your service account in the list
2. Click the **three dots** (⋮) → **Manage keys**
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Click **Create**
6. **Save the downloaded file** as `service-account-key.json` in your backend directory

## Step 6: Update .env File

Add these lines to `backend/.env`:

```env
GCS_BUCKET_NAME=galleriq-media
GCS_PROJECT_ID=your-actual-project-id
GOOGLE_APPLICATION_CREDENTIALS=service-account-key.json
```

## Step 7: Test Connection

```python
# Test script
from google.cloud import storage
import os

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'service-account-key.json'
client = storage.Client()
bucket = client.bucket('galleriq-media')
print(f"✅ Connected to bucket: {bucket.name}")
```

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `service-account-key.json` to git
- It's already in `.gitignore`
- Keep this file secure - it has full access to your GCS bucket
- Rotate keys periodically for security

## Troubleshooting

**Error: "Could not automatically determine credentials"**
- Make sure `GOOGLE_APPLICATION_CREDENTIALS` points to the correct file
- Check that the file exists and is valid JSON

**Error: "Permission denied"**
- Verify service account has "Storage Object Admin" role
- Check bucket permissions

**Error: "Bucket not found"**
- Verify bucket name in `.env` matches actual bucket name
- Check that bucket exists in the correct project
