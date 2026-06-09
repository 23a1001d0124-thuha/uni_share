# UNI-SHARE (Next.js + Express)

Project now runs on Next.js App Router for UI rendering, while `server.ts` provides Express APIs and socket features.

## Prerequisites

- Node.js 20+

## Environment

Create `.env.local` (or `.env`) and provide required keys:

- `GEMINI_API_KEY`
- Supabase and email variables used by the server (if applicable)

## Development

1. Install dependencies:
   `npm install --legacy-peer-deps`
2. Start development server (Express + Next):
   `npm run dev`
3. Open:
   `http://localhost:3000`

### Next.js only mode

- Run Next.js App Router only: `npm run dev:next`
- Build Next.js only: `npm run build:next`
- Start Next.js only build: `npm run start:next`

## Production Build

1. Build Next frontend and bundle Express server:
   `npm run build`
2. Start production server:
   `npm run start`

## Helpful Scripts

- `npm run dev`: run local development server
- `npm run build`: build Next app and bundle server to `dist/server.cjs`
- `npm run start`: start bundled production server
- `npm run clean`: remove build artifacts

## Notes

- The current dependency graph uses a React RC version, so `npm install` may fail with peer-resolution errors.
- This project is configured to use `legacy-peer-deps` for reproducible installs.
- Project is in migration from Express APIs to Next App Router APIs.
- Migrated Next route handlers: `/api/universities/detect`, `/api/products`, `/api/wants`, `/api/forum`, `/api/chats`.
