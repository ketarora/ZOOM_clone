# ZoomConnect — Frontend

A full-featured video meeting web application built with Next.js 15 and React 19. The UI closely mirrors Zoom Workplace complete with a dashboard, meeting scheduler, live meeting room with media controls, waiting room flow, participant management, and real-time chat.

**Live →** [zoom-clone-roan-delta.vercel.app](https://zoom-clone-roan-delta.vercel.app)  

**Backend API →** [zoom-clone-backend-2.onrender.com](https://zoom-clone-backend-2.onrender.com)

**Backend Repo →** [zoom-clone-backend](https://github.com/ketarora/ZOOM_clone_backend/tree/main)

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 |
| Styling | Tailwind CSS v4 |
| Data fetching | TanStack Query v5 |
| Icons | Lucide React |
| Date handling | date-fns |
| Language | TypeScript 5 |
| Deployment | Vercel |

---

## Features

**Core (per assignment):**

- **Dashboard** — meeting stats, upcoming/recent lists from the backend, quick-action tiles (New / Join / Schedule)
- **Instant meetings** — one click to start, unique Zoom-style ID + shareable invite link, straight into the room
- **Join flow** — join by **Meeting ID or full invite link**, display name required (button stays disabled until valid), camera/mic preview, clear errors for invalid IDs vs ended meetings
- **Scheduler** — title/description, date + time picker, duration, passcode, past-date validation; appears in Upcoming immediately (React Query invalidation)
- **Meeting room** — meeting title/ID/invite link, Zoom-style bottom bar (Mute, Video, Host Tools, Participants, Chat, Reactions, Share, Raise Hand, Leave/End), participant panel from the database, local camera preview + screen share
- **Launch page** — pre-meeting info, copy-invite, participant list, start/end controls
- **Profile & Settings** — navbar placeholders as required

**Bonus:**

- **Host controls** — mute-all + remove participant (real API calls)
- **Responsive** — mobile / tablet / desktop layouts
- **Waiting-room admission** — admit participants via the API
- **Edit/delete meetings** — delete in UI; partial update via API

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard / home
│   ├── join/page.tsx         # Join flow (form → preview → waiting room)
│   ├── schedule/page.tsx     # Schedule a meeting
│   ├── meetings/page.tsx     # Meeting list with filters
│   ├── launch/[meetingId]/   # Pre-meeting launch screen
│   ├── room/[meetingId]/     # Live meeting room
│   ├── profile/page.tsx
│   └── settings/page.tsx
├── components/
│   └── layout/
│       ├── AppLayout.tsx
│       ├── TopNav.tsx
│       └── Sidebar.tsx
└── lib/
    ├── api.ts                # Type-safe API client
    ├── hooks.ts              # React Query hooks
    └── utils.ts              # Helpers (formatMeetingId, avatarColor, etc.)
```

---

## Getting Started

```bash
git clone https://github.com/ketarora/zoom__clone.git
cd zoom__clone

npm install

# Point at the API
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
# http://localhost:3000
```

The `next.config.ts` rewrites `/api/*` to the backend, so no CORS issues in development.

---

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI backend (no trailing slash) |

---

## Scripts

```bash
npm run dev        # Development server (port 3000)
npm run build      # Production build
npm run start      # Production server
npm run typecheck  # tsc --noEmit
npm run lint       # Next.js ESLint
```

---

## API Contract

All requests go through `/api/*` (rewritten to the backend). The client in `src/lib/api.ts` — the **only** place that calls the backend — covers:

- `GET /me` — default logged-in user
- `GET/POST /meetings` — list (filterable, paginated) and create
- `POST /meetings/instant`, `POST /meetings/schedule` — spec aliases
- `GET/PATCH/DELETE /meetings/:id` — single meeting CRUD
- `POST /meetings/:id/join` — join with display name (410 if ended)
- `POST /meetings/:id/leave` — mark a participant as left
- `POST /meetings/:id/end` — end for all
- `GET /meetings/:id/participants` — participant list
- `POST /meetings/:id/mute-all` — host control
- `DELETE /meetings/:id/participants/:pid` — host control
- `GET /dashboard/summary` — aggregated stats

Response shapes match the TypeScript interfaces in `api.ts` directly — no transformation layer needed.

## Database Schema

Owned by the backend — see [backend README](https://github.com/ketarora/ZOOM_clone_backend#database-schema).
Short version: `users 1—* meetings 1—* participants`, guests allowed via
nullable `participants.user_id`, live `participant_count` as a SQL subquery
(never stored), indexes on `meeting_id`, `status`, `scheduled_at`, `host_id`.

---

## Deployment

Deployed on Vercel. Set `NEXT_PUBLIC_API_URL` to the Render backend URL in the Vercel environment variables dashboard.

```
NEXT_PUBLIC_API_URL=https://zoom-clone-backend-2.onrender.com
```

---

## License

MIT
