# Blood Donation P2P App (MERN + TypeScript)

Peer-to-peer blood request and donation: users enroll with their blood type; when someone requests that blood type at a hospital within a configurable radius, matching donors are notified and can pledge to donate.

## Stack

- **Backend:** Node, Express, TypeScript, MongoDB (Mongoose), Socket.IO
- **Frontend:** React, Vite, TypeScript, React Router

## Features

- **Donor enrollment:** Username + blood type (and optional location)
- **Active requests:** List of nearby pending requests, sort by distance or blood type
- **Request details:** Compatibility check, hospital info, distance, “I can donate” → “I’m on the way” → “I donated” flow
- **Request blood:** Form with patient name, hospital (searchable), blood type, notes; one pending request per user
- **Top donors:** Leaderboard (this year / all time) by donation count
- **60-day cooldown** and **1,000 points per donation** (configurable)
- **Real-time:** Socket.IO notifies matching donors when a new request is created (optional; connect with `userId` to receive “urgent request” events)

## Setup

### Prerequisites

- Node 18+
- MongoDB (local or Atlas)
- pnpm (or npm)

### 1. Install and env

```bash
cd blood-donation-app
pnpm install
cp backend/.env.example backend/.env
# Edit backend/.env: set MONGODB_URI, optional PORT, CORS_ORIGIN, etc.
```

### 2. Seed hospitals (optional)

```bash
cd backend
npx tsx src/scripts/seedHospitals.ts
```

### 3. Run backend and frontend

From repo root:

```bash
pnpm run dev
```

- Backend: http://localhost:4000  
- Frontend: http://localhost:3000 (proxies /api and /socket.io to backend)

Or run separately:

```bash
pnpm run dev:backend   # backend only
pnpm run dev:frontend  # frontend only
```

### 4. Use the app

1. Open http://localhost:3000 and “Join as donor” (username + blood type).
2. Allow location so “Active requests” can show nearby requests.
3. Create a blood request (Request Blood → select hospital → submit).
4. As another user (different browser/incognito), open the app, enroll, and you should see the request if within radius and compatible; pledge and go through the donation flow.

## API overview

- `POST /api/users` – create user (username, bloodType, optional location)
- `GET /api/users/me?userId=` – current user + daysUntilCanDonate
- `PATCH /api/users/me/blood-type`, `.../location`, `.../opt-out`, `.../opt-in`
- `GET /api/users/stats` – active donor count
- `GET /api/users/leaderboard?period=year|all`
- `GET /api/hospitals?q=` – list/search hospitals
- `POST /api/requests` – create request (patientName, hospitalId, bloodTypeNeeded, etc.; one pending per user)
- `GET /api/requests/active?lng=&lat=&radiusKm=&sort=` – active requests near a point
- `GET /api/requests/:id?lng=&lat=` – request detail + distance
- `POST /api/donations/pledge` – body `{ requestId }`, donor pledges
- `PATCH /api/donations/:id/status` – body `{ status: 'on_the_way'|'donated'|'cancelled' }`
- `POST /api/donations/:id/confirm` – confirm donation (idempotent)
- `GET /api/donations/by-request/:requestId` – current user’s donation for that request

## Env (backend)

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4000 | Server port |
| MONGODB_URI | mongodb://localhost:27017/blood-donation | MongoDB connection |
| CORS_ORIGIN | http://localhost:3000 | Allowed frontend origin |
| DONATION_COOLDOWN_DAYS | 60 | Days between donations |
| POINTS_PER_DONATION | 1000 | Points per confirmed donation |
| DEFAULT_RADIUS_KM | 50 | Default radius for nearby requests |

## Blood type compatibility

Recipient → compatible donors (included in backend and frontend):

- A+ ← A+, A-, O+, O-
- A- ← A-, O-
- B+ ← B+, B-, O+, O-
- B- ← B-, O-
- AB+ ← all
- AB- ← A-, B-, AB-, O-
- O+ ← O+, O-
- O- ← O-
