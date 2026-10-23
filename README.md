# FillrAI — one agent for every government document

Keep your government documents (Aadhaar, PAN, ration card, …) in one vault, and FillrAI
pre-fills every scheme application from them.

## Stack

- **Backend:** Node.js + Express + MongoDB (`backend/src/`)
- **Frontend:** plain HTML + CSS + JavaScript, one page per file (`frontend/`)
- **AI (optional):** Google Gemini for the chat assistant and reading uploaded documents (`GEMINI_API_KEY`)

## Configure secrets

Copy .env.example to .env and fill in your own API key, database, and optional SMTP settings. Never commit .env.

## Run with Docker

```bash
docker compose up --build
```

Open http://localhost:8000. The first start loads the demo data into MongoDB.
`docker compose down -v` deletes the database so the next start re-seeds it.

## Run without Docker

MongoDB must be running. In `.env` set `MONGODB_URL=mongodb://127.0.0.1:27017`, then:

```bash
./start.sh        # Mac/Linux
start.bat         # Windows
```

Tests: `cd backend && npm test`

## Demo login

`user01@example.com` … `user50@example.com`, password `fillrai1234`.
DigiLocker OTPs are printed in the server terminal.

## Project layout

```
backend/src/
  server.js            app setup: static files, routes, error handler
  db.js                MongoDB connection + small helpers
  seed.js              loads demo data on first start
  profile.js           merges a user's document data into one profile; eligibility rules
  gemini.js            calls the Gemini API
  routes/auth.js       register, login, JWT check
  routes/documents.js  vault, DigiLocker fetch (simulated), upload
  routes/schemes.js    scheme list + details
  routes/applications.js  submit + track applications
  routes/chat.js       AI assistant
  routes/account.js    saved answers, notifications, dashboard
frontend/
  *.html               one file per page
  css/style.css        all styles
  js/common.js         shared: login check, api() helper, sidebar
  js/<page>.js         code for each page
```

## Pages

| Page | What it does |
|------|-------------|
| Dashboard | Counts, profile completeness, recommended schemes, recent applications |
| Apply | All schemes, search + category filter, eligible / not eligible |
| Scheme | 1. Fill (pre-filled from vault) → 2. Submit (direct, or via official portal) → 3. Done |
| My Documents | Fetch from DigiLocker (OTP) or upload a file; remove |
| Track | Application status history; "Advance status" simulates the department |
| AI Assistant | Gemini chat with your profile + scheme list as context |
| Notifications | Alerts; click to open the related page |
| Settings | Name / phone, and the full profile FillrAI has built |

To add schemes, fields or document types straight in MongoDB see `data/ADD_TO_DATABASE.md`.


