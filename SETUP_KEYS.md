# How to Get API Keys

## 1. Google Client ID & Secret (for Login & YouTube)

1.  **Go to Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  **Create a New Project**: Click the dropdown at the top left and select "New Project". Name it (e.g., "YouTube Dashboard") and create it.
3.  **Enable YouTube API**:
    *   Go to **APIs & Services** > **Library**.
    *   Search for **"YouTube Data API v3"**.
    *   Click **Enable**.
4.  **Configure OAuth Consent Screen**:
    *   Go to **APIs & Services** > **OAuth consent screen**.
    *   Select **External** and click **Create**.
    *   Fill in "App Name" (e.g., "YouTube Dashboard"), "User Support Email", and "Developer Contact Email".
    *   Click **Save and Continue** through the other steps (you can skip "Scopes" and "Test Users" for now, or add your email to "Test Users" if you keep it in Testing mode).
5.  **Create Credentials**:
    *   Go to **APIs & Services** > **Credentials**.
    *   Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
    *   **Application Type**: Select **Web application**.
    *   **Authorized JavaScript origins**: Add `http://localhost:3000`
    *   **Authorized redirect URIs**: Add `http://localhost:3000/api/auth/callback/google`
    *   Click **Create**.
6.  **Copy Keys**:
    *   Copy **Client ID** -> `GOOGLE_CLIENT_ID`
    *   Copy **Client Secret** -> `GOOGLE_CLIENT_SECRET`

## 2. Google Gemini API Key (for AI Titles)

1.  **Go to Google AI Studio**: [https://aistudio.google.com/](https://aistudio.google.com/)
2.  **Sign in** with your Google Account.
3.  **Get Key**:
    *   Click **Get API Key** on the left sidebar.
    *   Click **Create API Key**.
    *   Select the Google Cloud project you just created (or a new one).
    *   Copy the key -> `GEMINI_API_KEY`
