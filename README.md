# YouTube Companion Dashboard

A mini-dashboard to manage YouTube videos, take notes, and get AI-powered title suggestions.

## Features

- **Video Details**: View stats (views, likes, comments).
- **Management**: Update video title and description.
- **Comments**: View, reply to, and delete comments.
- **Notes**: Take notes for each video (stored in MongoDB).
- **AI Tools**: Generate SEO-friendly titles using Google Gemini.
- **Logging**: All actions are logged to a database.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), shadcn/ui, TailwindCSS.
- **Backend**: Next.js API Routes.
- **Database**: MongoDB (Mongoose).
- **Auth**: NextAuth.js (Google/YouTube).
- **AI**: Google Gemini Pro.

## Setup

1. **Clone the repo**
2. **Install dependencies**: `npm install`
3. **Environment Variables**: Create `.env.local`
   ```bash
   MONGODB_URI=...
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=...
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GEMINI_API_KEY=...
   ```
4. **Run**: `npm run dev`

## API Endpoints

### Auth
- `GET/POST /api/auth/[...nextauth]`: Handles Google OAuth.

### Notes
- `GET /api/notes?videoId={id}&search={term}`: Fetch notes.
- `POST /api/notes`: Create a note. Body: `{ videoId, content, tags }`
- `PUT /api/notes/{id}`: Update a note.
- `DELETE /api/notes/{id}`: Delete a note.

### AI
- `POST /api/ai/suggest`: Generate titles. Body: `{ title, description }`

## Database Schema

### Note
```typescript
{
  videoId: string;   // YouTube Video ID
  content: string;   // Note text
  tags: string[];    // Optional tags
  createdAt: Date;
}
```

### Log
```typescript
{
  event: string;     // e.g., 'NOTE_CREATED', 'AI_SUGGESTIONS_GENERATED'
  details: Object;   // JSON metadata
  timestamp: Date;
}
```

## Deployment

1. Push to GitHub.
2. Import project to Vercel.
3. Add Environment Variables in Vercel Dashboard.
4. Deploy!
