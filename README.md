<p align="center">
  <img src="./public/logo.png" alt="MASTER TOEIC Logo" width="120" height="120" />
</p>

# MASTER TOEIC - AI-Powered TOEIC Speaking & Writing Practice Platform

<p align="center">
  <b>English</b> | <b><a href="./docs/vi/README.md">Tiếng Việt</a></b>
</p>

MASTER TOEIC is a minimalist, highly efficient, and completely free (zero operational cost) serverless web application designed to help users practice and take mock tests for both the Speaking and Writing sections under the official international TOEIC format.

The system supports a **Free Self-Grading Workflow via Gemini Web**, which is secure, privacy-friendly, and requires no API keys or proxy servers.

---

## 🌟 Key Features

*   **Zen Exam Room:** A distraction-free testing environment that automatically hides navigation, footers, and other side elements to help students focus entirely on their exam.
*   **Official TOEIC S&W Format:** Practice tests are designed to 100% match the ETS official test structure (11 Speaking questions, 8 Writing questions).
*   **Speech Recognition & Real-time Audio Visualizer:**
    *   Uses **MediaRecorder API** and HTML5 Web Audio API to draw real-time canvas waveform visualizations during Speaking voice recordings.
    *   Integrates **Web Speech API (Speech Recognition)** to automatically transcribe spoken answers to text for grading assistance.
*   **Radar Chart & Custom Audio Player:**
    *   Features a mono-colored **Radar Chart (`react-chartjs-2`)** displaying subscore performance metrics (Pronunciation, Fluency, Grammar, Vocabulary, Cohesion).
    *   Custom Audio Player supporting playback speeds (0.75x, 1x, 1.25x, 1.5x, 2x) for shadowing practice.
*   **Customizable Time (Practice Mode):** Allows students to extend preparation/response time (x1.5) or shorten it (x0.5) to challenge themselves.
*   **Flexible Architecture (Cloud Sync & Local-first):** Seamlessly syncs practice history and custom tests to **Supabase Database & Storage** (when logged in) or falls back to browser **LocalStorage** (Guest Mode).

---

## 🛠️ Tech Stack & Libraries

*   **Core Framework:** Next.js (React / TypeScript) - App Router
*   **Database, Auth & Storage:** Supabase (PostgreSQL + Row-Level Security + Storage Buckets)
*   **AI Engine:** Compatible with multimodal AI web platforms like Google Gemini Web, ChatGPT, and Claude (via JSON clipboard injection).
*   **Styling:** Vanilla CSS (CSS Variables) - Light / Dark Mode, responsive, adhering to the "Purple Ban" (no purple accents) for a professional look.
*   **Icons:** `lucide-react`
*   **Effects:** `canvas-confetti`

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
*   **Node.js** (v18 or higher installed).
*   A free **Supabase** account with a project created.

### 2. Setup and Run
1.  Clone the repository and enter the directory:
    ```bash
    git clone https://github.com/your-username/MasterToeic.git
    cd MasterToeic
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create your local environment file `.env.local` based on `.env.example`:
    ```bash
    cp .env.example .env.local
    ```
4.  Update your Supabase credentials in `.env.local`.
5.  Start the local development server:
    ```bash
    npm run dev
    ```
6.  Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables (.env)

| Variable | Description | Required |
| :--- | :--- | :---: |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL. | Yes (for Cloud sync) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Project Anonymous/Public API key. | Yes (for Cloud sync) |

---

## 📄 Detailed Documentation (Docs)

Find deep technical documentation under `/docs/`:
*   [Product Requirements Document (PRD)](./docs/PRD.md): Product scope, targets, and feature flows.
*   [Design System & UI/UX (DESIGN)](./docs/DESIGN.md): UI styling, CSS variables, and brutalist design rules.
*   [System Architecture (ARCHITECTURE)](./docs/architecture.md): Data model, Audio pipelines, and Database Cron cleanups.
*   [Database Schema (SQL)](./supabase/migrations/20260613000000_init_schema.sql): SQL scripts to initialize Supabase tables.
*   [Storage Setup (SQL)](./supabase/migrations/20260618000000_setup_storage.sql): SQL scripts for storage buckets, RLS policies, and pg_cron cleanups.
*   [TOEIC S&W Format Specifications](./docs/toeic_format.md): Detail timings and rules for each test part.
*   [Getting Started & Deployment Guide](./docs/getting-started.md): Installation and production hosting on Vercel.
*   [Frequently Asked Questions (FAQ)](./docs/faq.md): Troubleshooting common usage questions.
*   [API Reference](./docs/api-reference.md): Interior API routes specs.

---

## 💡 Free AI Self-Grading Workflow

To maintain a zero operating cost structure, MASTER TOEIC supports a free, web-based self-grading loop:

1.  **Take the Test:** Complete Speaking/Writing sections and submit. The result page initially displays `Pending`.
2.  **Download Assets:** Click **"Download JSON & Audio"**. The platform downloads your answers as a JSON file and merges all individual Speaking recordings into **one single WAV audio file** with embedded AI instructions.
3.  **Copy Prompt:** Click **"Copy Prompt"** to copy the detailed grading criteria in Vietnamese.
4.  **Submit to Gemini Web:** Open [Gemini Web](https://gemini.google.com), attach the JSON and WAV files, paste the prompt, and send.
5.  **Apply Results:** Copy the JSON evaluation block returned by Gemini, paste it into the JSON text area on MASTER TOEIC, and click **"Apply Result"**. The screen will immediately render your radar chart, subscores, and grammar corrections.

---
Designed by **DaoHieuIT** (and maybe a little bit of AI) in 2026.
