# Changelog (CHANGELOG.md)

All notable changes to the **MASTER TOEIC** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.2] - 2026-06-20

### 🚀 Changed
* **Responsive Dashboard Tabs:** Added a responsive Tab Switcher for mobile/tablet screens to toggle between the Exam List and Practice History, solving viewport collapsing issues.
* **Settings Account Display:** Added a mobile-only user profile display showing the active student email inside the Settings drawer when it is hidden from the header.

## [1.0.1] - 2026-06-20

### 🚀 Changed
* **Database-Driven Image Pool:** Migrated Speaking & Writing image assets repository from local JSON storage (`unused_images.json`/`used_images.json`) to Supabase database table `toeic_images` with Row-Level Security (RLS) policies.
* **Sync API & CLI:** Updated the admin pipeline API endpoint (`/api/admin/pipeline`) and developer CLI tools (`pipeline_cli.js`) to read and write images directly to Supabase.
* **Asset Migration & Cleanup:** Synced 124 existing images to the remote database and cleared the local fallback JSON files.
* **Documentation:** Updated the image pipeline guide (`IMAGE_WORKFLOW.md`) to reflect the database-driven architecture.

## [1.0.0] - 2026-06-19

### 🎉 Added
* **Zen Exam Room:** A focused, distraction-free environment matching the official TOEIC S&W testing layout.
* **AI Self-Grading Workflow:** Complete package download containing exam attempts JSON + Speaking recordings merged into a single WAV audio file with embedded voice commands for easy grading on Gemini Web.
* **Audio Visualizer & Control:** Canvas audio waves visualizer during recording and a custom audio player supporting playback speed adjustments (0.75x to 2x).
* **Cloud Sync & Local-First:** Seamless synchronization between Supabase Cloud (Auth, Database, Storage, and pg_cron auto-cleanup for files older than 7 days) and browser LocalStorage.
* **Admin Dashboard:** Interface supporting AI prompt-driven test generation, direct JSON imports, manual test editing, and image pool assets management.
* **Button Progress Bars:** Real-time background sweep progress bars integrated directly into long-running admin buttons ("Recheck" and "Update Missing Images").
* **Settings Version Label:** Displays the active version at the bottom of the Settings Drawer.
* **Technical Documentation:** Detailed guides including architecture specifications (`architecture.md`), design system (`DESIGN.md`), PRD (`PRD.md`), TOEIC format specs (`toeic_format.md`), and Vercel development setups (`getting-started.md`).

### 🛠️ Fixed
* **Client-Side Image Validation:** Switched image checks to run parallelly on the client browser, eliminating false "broken link" errors caused by CDNs blocking server-side requests.
* **UI/UX Consistency:** Adjusted title font tracking for Space Grotesk, modal border-radius alignment, scrollbar formatting, and cleared out unused repository directories.
