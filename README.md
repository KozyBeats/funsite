# Discord-lite MVP

This repo contains a minimal Discord-like web app with servers, text channels, and voice channels.

## Architecture
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind (in `web/`)
- **Backend:** Node.js + Express + Socket.IO (in `server/`)
- **Database/Auth:** Supabase (Postgres + Auth)

## Features
- Servers + channels (text + voice)
- Text chat with Socket.IO broadcasts + typing indicators
- Message history loaded from Supabase on channel open
- Voice channels with WebRTC (audio only) + Socket.IO signaling
- Member list, mute/unmute, deafen/undeafen controls
- Simple Supabase Auth login page

## Setup

### 1) Supabase schema
Run the SQL in `docs/schema.sql` in your Supabase SQL editor.

### 2) Frontend (Next.js)
```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

### 3) Backend (Socket server)
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

### Environment variables

**web/.env.local**
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

**server/.env**
```
PORT=4000
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Notes
- The Socket.IO server inserts messages into Supabase and broadcasts them.
- Voice channels use a simple mesh WebRTC approach (one peer connection per remote user).
