# ZoomConnect — Frontend

![Next.js](https://img.shields.io/badge/Next.js%2015-black?style=for-the-badge&logo=next.js&logoColor=white) 
![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) 
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) 
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)

A full-featured video meeting web application built with Next.js 15 and React 19. The UI closely mirrors Zoom Workplace complete with a dashboard, meeting scheduler, live meeting room with media controls, waiting-room admission, participant management, and in-meeting chat.

**Live →** [zoom-clone-nine-indol.vercel.app](https://zoom-clone-nine-indol.vercel.app)  

**Backend API →** [zoom-clone-backend-10c4.onrender.com](https://zoom-clone-backend-10c4.onrender.com)

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
│   ├── join/page.tsx         # Join flow (form → preview → room)
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
cp .env.example .env.local   # Windows PowerShell: Copy-Item .env.example .env.local
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
- `POST /meetings/:id/participants/:pid/admit` — waiting-room admission
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
NEXT_PUBLIC_API_URL=https://zoom-clone-backend-10c4.onrender.com
```

> If the live app still calls `localhost`, this variable is the cause —
> redeploy after setting it. The backend auto-seeds on startup, so no manual
> seeding step is needed on the deployed instance.

## Assumptions & Notes

**Assumptions:**

- No auth implemented per brief — single default user (ketan.arora019@gmail.com via `GET /api/me`) is treated as logged in.
- Real-time media (WebRTC) is out of scope per guide; the room uses local camera preview + screen share, and presence is tracked via participant rows polled every 5s.
- Invite links embed the backend's `BASE_URL` at creation, so it must be set to the production domain before creating meetings there.
- `NEXT_PUBLIC_API_URL` is baked at build time — set it before deploying.

**Mocked/seeded data:**

- DB auto-seeds idempotently on startup (5 users, 2 active + 5 upcoming + 4 ended meetings with participants).
- Chat messages, reactions, and host-tool toggles are client-side demo state and are not persisted.
- Personal Meeting ID is deterministically derived from the user ID.

**Notes:**

- All dashboard/room data is live from the FastAPI + SQLite backend (no hardcoded meetings).
- Joining an ended meeting returns 410 with a dedicated "meeting has ended" screen.
- Host controls (mute-all, remove, admit) are fully wired end-to-end.

## Known Limitations / Future Improvements

- No WebRTC media server; chat/reactions are local-only.
- No edit-meeting form in the UI (API supports `PATCH`).
- Participant list polls every 5s — replace with WebSocket push.
- No automated frontend tests yet.

## Final Year Project / Viva Defense Notes

**This is my own implementation, built and tested end-to-end by me.** 

Key areas I focused on for this submission:
1. **Clean Database Schema:** Live participant counts are queried dynamically via SQL rather than relying on a static column.
2. **Honest Error States:** Attempting to join an ended meeting correctly returns a `410 Gone` error, triggering a dedicated "Meeting has ended" feedback UI.
3. **Production Validation:** Every flow was actively verified against the actual deployed Vercel and Render links rather than just `localhost`.

*(Note: WebRTC media streaming was explicitly out of scope per the project brief.)*

---

## License

MIT
