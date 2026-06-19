# API Reference (docs/api-reference.md)

This document specifies the internal API routes provided by **MASTER TOEIC** for syncing history, serving Text-to-Speech proxy audio, and managing image assets within the Admin portal.

---

## 🎧 1. TTS API (Text-to-Speech Proxy)
A local proxy endpoint to generate English instruction voice audio for Speaking exams.

*   **Endpoint:** `/api/tts`
*   **Method:** `GET`
*   **Query Parameters:**
    *   `text` (string, Required): The English text to be converted to speech.
*   **Response:**
    *   **Success (200 OK):** Returns binary audio stream format `audio/mpeg` (proxied from Google Translate TTS API).
    *   **Failure (400 / 500):** Returns a JSON error response:
        ```json
        { "error": "Text parameter is required" }
        ```

---

## 📈 2. Practice History API
Allows authenticated users to fetch and save their practice history attempts on Supabase.

### 2.1. Retrieve practice history
*   **Endpoint:** `/api/history`
*   **Method:** `GET`
*   **Query Parameters:**
    *   `userId` (string, Required): The UUID of the authenticated user.
*   **Response:**
    *   **Success (200 OK):** An array of previous mock test attempts, ordered from newest to oldest.

### 2.2. Save a new mock test attempt
*   **Endpoint:** `/api/history`
*   **Method:** `POST`
*   **Headers:** `Content-Type: application/json`
*   **Request Body JSON:**
    ```json
    {
      "userId": "user-uuid-from-supabase",
      "attempt": {
        "testId": "test-id-1",
        "testTitle": "TOEIC SW Actual Test 01",
        "mode": "full",
        "partName": null,
        "speakingScore": 120,
        "writingScore": 140,
        "reviews": [
          {
            "questionId": "sp_q_1",
            "section": "speaking",
            "score": 80,
            "feedback": "Clear pronunciation...",
            "audioUrl": "https://[ref].supabase.co/storage/v1/object/public/user_audio/..."
          }
        ]
      }
    }
    ```
*   **Response:**
    *   **Success (200 OK):** The saved attempt row data from Supabase.

---

## ⚙️ 3. Admin Pipeline API
Used to manage image assets for practice tests. Requires an authorized user with `admin` metadata role (checked via Authorization JWT headers).

*   **Endpoint:** `/api/admin/pipeline`
*   **Headers:**
    *   `Authorization: Bearer <JWT_TOKEN>` (Required)
    *   `Content-Type: application/json`

### 3.1. Bulk upload images to ImgBB
*   **Request (POST Body):**
    ```json
    {
      "action": "upload_imgbb",
      "urls": [
        "https://domain.com/photo1.jpg",
        "https://domain.com/photo2.png"
      ]
    }
    ```
*   **Response:**
    *   Returns array of uploaded ImgBB URLs, skipping links that are already hosted on ImgBB.

### 3.2. Generate Word Document (.docx) with images
Used to generate a Word file to upload to Gemini Web for batch analysis.
*   **Request (POST Body):**
    ```json
    {
      "action": "create_docx",
      "urls": [
        "https://i.ibb.co/xxxxx/photo1.jpg",
        "https://i.ibb.co/yyyyy/photo2.png"
      ]
    }
    ```
*   **Response:** Binary docx file `application/vnd.openxmlformats-officedocument.wordprocessingml.document` downloaded to client browser.

### 3.3. Import JSON descriptions from Gemini Web
*   **Request (POST Body):**
    ```json
    {
      "action": "import_gemini_descriptions",
      "descriptions": [
        {
          "url": "https://i.ibb.co/xxxxx/photo1.jpg",
          "description": "Two people working in an office...",
          "words": ["workspace", "discuss"]
        }
      ]
    }
    ```
*   **Response:** Counts of imported entries, duplicates skipped, and total remaining unused images in pool.

### 3.4. Auto-assign images to tests lacking photos
*   **Request (POST Body):**
    ```json
    {
      "action": "auto_fill_missing",
      "brokenUrls": ["https://i.ibb.co/xxxxx/deadphoto.jpg"]
    }
    ```
*   **Response:** Count of updated tests, names of updated tests, and remaining unused images in pool.
