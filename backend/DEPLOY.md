# Deploying Backend to Cloud Run with Cloud SQL (PostgreSQL)

This guide takes you through deploying your FastAPI backend to Google Cloud Run and connecting it to a persistent Google Cloud SQL (PostgreSQL) database.

---

## 1. Prerequisites

Ensure you have the Google Cloud SDK installed and authenticated:
```bash
gcloud init
gcloud auth application-default login
```

Make sure these APIs are enabled in your project:
```bash
gcloud services enable run.googleapis.com sqladmin.googleapis.com compute.googleapis.com cloudbuild.googleapis.com
```

---

## 2. Set up Cloud SQL (PostgreSQL)

1.  **Create the Database Instance**:
    *(Use the `db-f1-micro` as discussed, region `us-central1`)*
    ```bash
    gcloud sql instances create travel-suite-db \
        --database-version=POSTGRES_15 \
        --cpu=1 \
        --memory=3840MiB \
        --region=us-central1 \
        --root-password=DB_PASSWORD_HERE
    ```
    *Note: `db-f1-micro` is shared-core. If CLI complains about custom specs, use the Console GUI to select "Shared Core > f1-micro".*

2.  **Create the Database**:
    ```bash
    gcloud sql databases create travel_suite --instance=travel-suite-db
    ```

3.  **Create a User**:
    ```bash
    gcloud sql users create travel_user \
        --instance=travel-suite-db \
        --password=YOUR_STRONG_PASSWORD
    ```

4.  **Get Configuration Info**:
    Run this to get the "Connection Name":
    ```bash
    gcloud sql instances describe travel-suite-db --format="value(connectionName)"
    ```
    *   Save this value! It looks like: `project-id:us-central1:travel-suite-db`
    *   We will refer to this as `INSTANCE_CONNECTION_NAME`.

---

## 3. Build and Push Docker Image

Run inside the `backend` folder:

```bash
# Replace YOUR_PROJECT_ID
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/travel-suite-backend
```

---

## 4. Deploy to Cloud Run

We need to tell Cloud Run two things:
1.  **DATABASE_URL**: structured for the unix socket connection.
2.  **Cloud SQL Instance**: which instance to attach to the container.

**The DATABASE_URL Format:**
`postgresql+psycopg2://<USER>:<PASSWORD>@/<DB_NAME>?host=/cloudsql/<INSTANCE_CONNECTION_NAME>`

**Deploy Command:**
Replace the placeholders (`YOUR_PROJECT_ID`, `INSTANCE_CONNECTION_NAME`, `PASSWORD`, `USER`) below.

```bash
gcloud run deploy travel-suite-api \
  --image gcr.io/gcp-agents-481005/travel-suite-backend \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances gcp-agents-481005:us-central1:travel-suite-db \
  --set-env-vars "DATABASE_URL=postgresql+psycopg2://travel_user:Travelsuite%401@/travel_suite?host=/cloudsql/gcp-agents-481005:us-central1:travel-suite-db" \
  --port 8080
```

---

## 5. Running Migrations (Initial Setup)

Your tables won't execute automatically because the server only runs `create_all()` if it starts. Since `main.py` has `Base.metadata.create_all(bind=engine)`, **it should actually create tables automatically when the first container starts up**. 

Check logs if you see "Relation does not exist" errors.

---

## Cost Note
*   **Cloud Run**: Pay-per-use (likely free/cheap for low traffic).
*   **Cloud SQL (f1-micro)**: ~$8-12/month (running 24/7).
