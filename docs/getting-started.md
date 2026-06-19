# Getting Started Guide (docs/getting-started.md)

Welcome to the **MASTER TOEIC** project! This guide will help you set up the project locally on your machine, connect your Supabase database and storage buckets, and deploy the application to a production environment.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:
* **Node.js** (v18.x or newer).
* **Git** (For version control).
* A free **Supabase** account to store user data and Speaking recordings.

---

## 🛠️ Local Setup

### Step 1: Clone the Repository
Open your terminal and run:
```bash
git clone https://github.com/your-username/MasterToeic.git
cd MasterToeic
```

### Step 2: Install Dependencies
Install all required Node.js package dependencies:
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy the environment variables template file:
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in your Supabase connection parameters:
* `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project API URL.
* `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anonymous/Public API key.

---

## 🗄️ Setting Up Supabase Database & Storage

Follow these steps to configure your Supabase instance:

### 1. Database Schema
* Navigate to the **SQL Editor** on your Supabase Dashboard.
* Click **New Query**.
* Open the [20260613000000_init_schema.sql](../supabase/migrations/20260613000000_init_schema.sql) file, copy the entire SQL script, paste it into the editor, and click **Run**. This creates the `practice_history` and `custom_tests` tables.

### 2. Storage Buckets & Cron Job
* Open the [20260618000000_setup_storage.sql](../supabase/migrations/20260618000000_setup_storage.sql) file.
* Copy the SQL commands, paste them into the SQL Editor, and click **Run**. This script will:
  * Create a public storage bucket named `user_audio`.
  * Set up RLS policies ensuring users can only read all recordings but can only insert/delete their own recordings inside `user_audio/user_id/...`.
  * Create a database Cron Job using `pg_cron` that runs daily to automatically delete Speaking recording files older than 7 days, maintaining your free cloud storage tier forever.

---

## 🏃 Running Locally

Once configured, launch the development server:

```bash
npm run dev
```
* Open your browser and navigate to [http://localhost:3000](http://localhost:3000).
* You can sign up for a new account directly on the web interface to verify Cloud Sync features, or choose Guest Mode to store data locally in your browser's LocalStorage.

---

## 🚀 Deploying to Vercel

MASTER TOEIC is optimized to run serverless on Vercel:

### Step 1: Push Code to your GitHub Repo
```bash
git init
git add .
git commit -m "Initial commit of MASTER TOEIC"
git remote add origin https://github.com/your-username/MasterToeic.git
git branch -M main
git push -u origin main
```

### Step 2: Import Project on Vercel
1. Log in to [Vercel.com](https://vercel.com) using your GitHub account.
2. From the main dashboard, click **Add New...** ➔ select **Project**.
3. Locate the `MASTER TOEIC` repository and click **Import**.

### Step 3: Configure Variables and Deploy
1. Vercel will automatically select **Next.js** as the Framework Preset.
2. Expand the **Environment Variables** section and add:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Click the **Deploy** button. The build process completes in about 1-2 minutes, rendering your live public testing platform!
