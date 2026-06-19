# Product Requirements Document (PRD) - MASTER TOEIC

MASTER TOEIC is a serverless web platform designed to help users prepare for the Speaking and Writing modules of the official TOEIC S&W exam. It leverages public Gemini AI Web structures for free, detailed evaluations in Vietnamese under a zero-operational-cost architecture.

---

## 1. Objectives

*   **Standardized Simulator:** Mimic the official ETS exam environment (TOEIC S&W) as closely as possible in a browser.
*   **Automated Evaluation:** Provide diagnostic scoring, grammar correction, vocabulary feedback, and high-scoring sample answers.
*   **Zero Running Cost:** Built serverless (Next.js App Router deployed on Vercel) with no active server costs, saving user practice attempts on LocalStorage or Supabase Free tier.
*   **Distraction-Free UI:** Clean, minimalist UI that places student attention entirely on question prompts and responses.

---

## 2. Target Audience

*   **Self-Preparing Students:** Learners who need to practice Speaking and Writing but do not have teachers to review and grade their answers.
*   **Content Creators / Administrators:** Admins who want to quickly generate and manage mock tests via prompts without editing raw code.

---

## 3. Product Features

### 3.1. Zen Exam Room
*   **Focus State:** Hides all navigation menus, header links, and footers when entering exam mode.
*   **Visual cues:** Uses clean, large monospace countdown timers and prominent progress bars.

### 3.2. Official TOEIC S&W Structure
*   **Speaking Module (11 questions):**
    *   Q1-Q2: Read a Text Aloud
    *   Q3-Q4: Describe a Picture
    *   Q5-Q7: Respond to Questions
    *   Q8-Q10: Respond to Questions Using Information Provided
    *   Q11: Express an Opinion
*   **Writing Module (8 questions):**
    *   Q1-Q5: Write a Sentence Based on a Picture
    *   Q6-Q7: Respond to an Email Request
    *   Q8: Write an Opinion Essay

### 3.3. Free AI Grading & Feedback Loop
*   Allows users to download their response data (JSON format) along with a consolidated audio recording containing all Speaking responses.
*   Provides a customized instruction prompt. Users feed their attempt file + audio into Gemini Web, and paste the generated JSON report back to MASTER TOEIC to render scoring metrics.

### 3.4. Speech-to-Text & Canvas Waveform
*   Captures student recordings and draws dynamic audio waves in real-time.
*   Uses HTML5 SpeechRecognition to transcribe speech to text.

### 3.5. Supabase Synchronization & Local-first
*   Authenticated users have attempts synced to Supabase Database, with audio files uploaded to Supabase Storage.
*   Unauthenticated guests have attempts stored locally in browser LocalStorage.

---

## 4. Non-Functional Requirements

*   **Performance:** Fast initial page loads; audio merging must execute entirely client-side using Web Audio API to prevent server bottlenecks.
*   **Security:** Enforce Row-Level Security (RLS) policies on Supabase. Users can only edit or upload audio to their own directory.
*   **Storage Policies:** Automatic Daily Cron Cleanups purge recording files older than 7 days from Supabase Storage.
