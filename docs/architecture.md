# System Architecture (docs/architecture.md)

This document describes the technical architecture, data model, audio pipelines, and AI integration flow of the **MASTER TOEIC** platform.

---

## 1. Architecture Overview

MASTER TOEIC is a serverless web application built on Next.js (App Router) operating on a hybrid client-cloud sync model:

*   **Guest Mode (Offline-First):** All exam history is stored in the browser's `localStorage`. Speaking recording files are stored temporarily as memory Object URLs (`blob:`). No cloud storage bandwidth or database connections are used.
*   **Authenticated Mode (Cloud Sync):** Exam results are synced directly to Supabase Database. Speaking recording audio files are uploaded to Supabase Storage, and a database-level cleanup cron deletes recordings older than 7 days.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              NEXT.JS CLIENT                            │
│                                                                        │
│  ┌────────────────────────┐  Audio Blob  ┌──────────────────────────┐  │
│  │    Speaking/Writing    ├─────────────►│    Audio Merge Utility   │  │
│  │        Consoles        │              │  (TTS Marker + Silence)  │  │
│  └───────────┬────────────┘              └────────────┬─────────────┘  │
│              │ Reviews JSON                           │ WAV Audio      │
│              ▼                                        ▼                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         Attempt Handler                          │  │
│  └───────────┬────────────────────────────────────────┬─────────────┘  │
└──────────────┼────────────────────────────────────────┼────────────────┘
               │                                        │
      REST     │ RPC / INSERT                           │ Upload
      API      ▼                                        ▼
┌──────────────┴──────────────┐          ┌──────────────┴──────────────┐
│      SUPABASE DATABASE      │          │       SUPABASE STORAGE      │
│    (practice_history)       │          │        (user_audio)         │
└─────────────────────────────┘          └──────────────┬──────────────┘
                                                        │
                                                        │ Daily Job
                                                        ▼
                                                 ┌──────────────┐
                                                 │   pg_cron    │
                                                 │ (Auto-delete │
                                                 │  after 7d)   │
                                                 └──────────────┘
```

---

## 2. Technology Stack

*   **Core:** React 19, Next.js 16 (App Router), TypeScript.
*   **Styling:** Vanilla CSS + CSS Variables (Brutalist minimalistic style, avoiding Tailwind CSS or UI component libraries to keep bundle size light and paint times fast).
*   **Database & Storage:** Supabase (PostgreSQL, Storage API).
*   **Audio API:** Web Audio API (decoding, blending, concatenating), MediaRecorder API (recording).
*   **AI Integration:** Compatible with Google Gemini Web (manual JSON clipboard injection).
*   **Charts:** Chart.js + react-chartjs-2 (Radar chart analyzing subscores).

---

## 3. Data Model

### 3.1. Practice History Table (`practice_history`)
Stores exam mock attempts submitted by authenticated users.

```sql
CREATE TABLE IF NOT EXISTS public.practice_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    test_id TEXT NOT NULL,
    test_title TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    mode TEXT NOT NULL, -- 'full' | 'speaking' | 'writing' | 'part'
    part_name TEXT,     -- e.g. "SPEAKING Part 3"
    speaking_score INTEGER, -- 0 - 200 (or NULL if not taken)
    writing_score INTEGER,  -- 0 - 200 (or NULL if not taken)
    reviews JSONB NOT NULL  -- Array containing details of each question
);
```

#### JSONB structure inside the `reviews` array:
```json
{
  "questionId": "sp_q_1_1",
  "partTitle": "Part 1: Read a Text Aloud",
  "questionText": "If you're shopping, sightseeing...",
  "answer": "If you're shopping, sightseeing...",
  "audioUrl": "https://[ref].supabase.co/storage/v1/object/public/user_audio/[user_id]/[attempt_id]/sp_q_1_1.webm",
  "section": "speaking",
  "score": 80,
  "feedback": "Clear pronunciation, good pacing...",
  "grammarErrors": [
    {
      "original": "shoping",
      "correction": "shopping",
      "explanation": "Spelling mistake: shopping."
    }
  ],
  "computedSubscores": {
    "pronunciation": 85,
    "fluency": 80,
    "taskCompletion": 90,
    "grammar": 80,
    "vocabulary": 80,
    "cohesion": 80
  }
}
```

### 3.2. Audio Storage Bucket (`user_audio`)
*   **Access Type:** Public (directly streamable via HTML `<audio>` elements).
*   **Row-Level Security (RLS) Policies:**
    *   **SELECT:** Anonymous public read access (enables evaluation or student playback).
    *   **INSERT / DELETE:** Checked via `auth.uid()` validation, restricting uploads to folders matching their user UUID: `user_audio/[auth.uid()]/...`.
*   **File path naming:** `user_audio/[user_id]/[attempt_id]/[question_id].[ext]`

---

## 4. Audio Pipelines

The application uses two distinct pipelines to handle recording:

### 4.1. Recording & Storage Upload Pipeline
When a user completes a Speaking question:
1.  **MediaRecorder API** captures input ➔ outputs browser-native Blob (`audio/webm` on Chrome/Android, `audio/mp4` on Safari/iOS).
2.  Upon exam completion:
    -   If logged in, the client reads the binary buffers from the temporary Blob URLs.
    -   Uploads files in parallel to Supabase Storage bucket `user_audio`.
    -   Stores returned public CDN links in the `reviews` array.

### 4.2. Audio Merging Pipeline (Local Download)
To support offline, zero-cost grading on Gemini Web, the [audio.ts](file:///d:/Workspace/MasterToeic/src/utils/audio.ts) utility decodes and concatenates audio inside the browser via **Web Audio API**:
1.  **TTS Markers:** Fetches instruction audio clips (e.g. *"Part 1, Question 1"*) from `/api/tts`.
2.  **Decoding:** Decodes TTS and client voice blobs into `AudioBuffer` buffers.
3.  **Silent Intervals:** Inserts 1.0s silence after instructions and 1.5s silence between answers.
4.  **Concatenation:** Calculates total duration, allocations one single large buffer, copies sub-buffers into offsets, and encodes the output into **16-bit PCM Mono WAV format** for local download.

---

## 5. Automated Cleanup Cron Job

To prevent cloud storage quotas from filling up on the free tier, we use Supabase PostgreSQL **`pg_cron`**:

*   **Database function `cleanup_old_user_audio()`** runs with elevated permissions (`SECURITY DEFINER`) to delete database records:
    ```sql
    DELETE FROM storage.objects
    WHERE bucket_id = 'user_audio'
      AND created_at < (now() - INTERVAL '7 days');
    ```
*   **Cron Schedule:** Fires daily at midnight (`0 0 * * *`) to invoke the function. Webhook triggers inside Supabase Storage then delete the actual physical files from the cloud bucket.
