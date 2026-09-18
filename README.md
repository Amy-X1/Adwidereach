# Business Website — Full-Stack App

A production-ready business website with public marketing pages, user registration/login,
a user dashboard, and an admin dashboard — built on Next.js, Express, Prisma and JWT.

## Tech Stack

| Layer      | Choice                                             |
|------------|-----------------------------------------------------|
| Frontend   | Next.js 14 (Pages Router) + Tailwind CSS + Framer Motion |
| Backend    | Node.js + Express 4                                |
| Database   | SQLite by default (zero-config) — swap to PostgreSQL/MySQL in one line |
| ORM        | Prisma 5                                           |
| Auth       | JWT (Bearer token) + bcrypt password hashing        |
| Validation | express-validator (server) + client-side form checks |
| Security   | helmet, cors, express-rate-limit, xss-clean, hpp, express-mongo-sanitize |

---

## 1. Project Structure

```
project/
├── server/                  # Express API
│   ├── prisma/
│   │   ├── schema.prisma    # User, ContactMessage, AuditLog models
│   │   └── seed.js          # Creates the default admin account
│   ├── src/
│   │   ├── config/db.js     # Prisma client singleton
│   │   ├── controllers/     # auth, user, admin, contact
│   │   ├── routes/          # authRoutes, userRoutes, adminRoutes, contactRoutes
│   │   ├── middleware/      # auth (JWT), validate, rateLimiter, errorHandler
│   │   ├── utils/           # jwt, validators, ApiError, asyncHandler
│   │   ├── app.js           # Express app + middleware wiring
│   │   └── index.js         # Server entrypoint
│   ├── .env.example
│   └── package.json
└── client/                  # Next.js app
    ├── pages/                # index, about, services, contact, register, login,
    │                         # dashboard, admin, 404, _app, _document
    ├── components/           # Navbar, Footer, Layout, FormField, Spinner, ProtectedRoute
    ├── context/              # AuthContext (JWT/session), ThemeContext (dark/light)
    ├── lib/api.js            # Axios instance wired to the backend
    └── package.json
```

---

## 2. Prerequisites

- Node.js 18+ and npm
- Nothing else required for local dev — the default database is SQLite, a single file
  created automatically by Prisma. No database server to install.

For production you'll typically point this at PostgreSQL or MySQL — see §7.

---

## 3. Installation & Local Setup

### Option A — one command from the project root (recommended)

The root `package.json` uses `concurrently` to install, set up the database, and run
both the API and the website together from a single terminal.

```bash
# from the project root
npm install                # installs the root-level "concurrently" helper
npm run install:all        # installs server/ and client/ dependencies
cp server/.env.example server/.env    # edit values as needed (see §4)
npm run setup:db           # creates dev.db, runs migrations, seeds the admin account
npm run dev                # starts BOTH the API (5000) and the website (3000)
```

You'll see interleaved, color-coded logs prefixed `[API]` and `[WEB]` in the same
terminal. Stop both with `Ctrl+C`.

### Option B — run each app separately (two terminals)

```bash
# Terminal 1 — Backend
cd server
cp .env.example .env          # edit values as needed (see §4)
npm install
npx prisma migrate dev --name init   # creates dev.db and the tables
npm run seed                          # creates the default admin account
npm run dev                           # starts the API on http://localhost:5000

# Terminal 2 — Frontend
cd client
npm install
npm run dev                           # starts the site on http://localhost:3000
```

Both options end up running the exact same two processes — Option A just launches them
with one command instead of two.

Open **http://localhost:3000**. Register a user, or log in with the seeded admin:

```
Email:    admin@business.com
Password: Admin@12345
```

(Change `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` before seeding if you want different
credentials — the seed script reads them from the environment.)

### Using it as a visitor / customer

1. Browse the public pages: Home, About, Services, Contact (the Contact form saves
   straight to the `ContactMessage` table — no login needed).
2. Click **Register**, fill in the form. On success you're logged in automatically and
   redirected to `/dashboard`.
3. On `/dashboard` you can view your profile, edit your details, change your password,
   or delete your account.
4. Click **Login** any time afterward using your email/username + password.

### Using it as an admin

1. Log in with the seeded admin credentials above (or promote any user to `ADMIN` — see
   below).
2. You'll be able to visit `/admin`, which a regular user cannot access
   (`ProtectedRoute` + the server's `authorize('ADMIN')` middleware both block it).
3. From there: view live stats (total users, new today, registration trend chart),
   search/filter/sort the user list, edit or delete any user, and export all users to
   CSV.

**To make an existing user an admin:** the fastest way is `npx prisma studio --schema
server/prisma/schema.prisma` (opens a local GUI on the `User` table) and change that
row's `role` field from `USER` to `ADMIN`.

---

## 4. Environment Variables (`server/.env`)

```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# SQLite (default, zero-config):
DATABASE_URL="file:./dev.db"
# PostgreSQL example:
# DATABASE_URL="postgresql://user:password@localhost:5432/business_app?schema=public"

JWT_SECRET=replace_this_with_a_long_random_string_at_least_32_chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=replace_this_with_a_different_long_random_string
JWT_REFRESH_EXPIRES_IN=30d

BCRYPT_SALT_ROUNDS=12

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=200

ADMIN_EMAIL=admin@business.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin@12345
```

**Never commit `.env` to source control.** `JWT_SECRET` and `JWT_REFRESH_SECRET` must be
long, random strings in production (e.g. `openssl rand -hex 32`).

The client reads the API URL from `client/.env.local`:
```ini
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 5. Database Schema

**User**
```
id, fullName, username (unique), email (unique), phone, dob, gender,
country, state, city, businessName (optional), address,
passwordHash, role (USER|ADMIN), isActive, avatarUrl, lastLoginAt,
createdAt, updatedAt
```

**ContactMessage**
```
id, name, email, phone (optional), subject, message, createdAt
```

**AuditLog** — records register/login/login-failed/profile-update/admin actions with
`userId`, `action`, `ipAddress`, `userAgent`, `createdAt`, for the activity trail.

Passwords are **never** stored in plain text — only a bcrypt hash (12 salt rounds by
default). All database access goes through Prisma's parameterized query builder, so
raw SQL string concatenation (and therefore classic SQL injection) is not possible
anywhere in this codebase.

---

## 6. API Reference

Base URL: `http://localhost:5000/api`

| Method | Endpoint                     | Auth        | Description                          |
|--------|-------------------------------|-------------|--------------------------------------|
| GET    | `/health`                     | —           | Health check                         |
| POST   | `/auth/register`              | —           | Create account, returns JWT          |
| POST   | `/auth/login`                 | —           | `{ identifier, password }` → JWT     |
| GET    | `/users/profile`               | User        | Get own profile                      |
| PUT    | `/users/profile`               | User        | Update own profile                   |
| PUT    | `/users/change-password`       | User        | Change password                      |
| DELETE | `/users/account`               | User        | Delete own account                   |
| GET    | `/admin/stats`                 | Admin       | Total/new-today/active users, trend  |
| GET    | `/admin/users`                 | Admin       | Search, filter, paginate, sort users |
| GET    | `/admin/users/:id`             | Admin       | Get one user                         |
| PUT    | `/admin/users/:id`              | Admin       | Edit a user                          |
| DELETE | `/admin/users/:id`              | Admin       | Delete a user                        |
| GET    | `/admin/users/export/csv`       | Admin       | Download all users as CSV            |
| GET    | `/admin/contacts`               | Admin       | List contact-form submissions        |
| POST   | `/contact`                     | —           | Submit the contact form              |

Authenticated requests send `Authorization: Bearer <token>`.

Query params on `GET /admin/users`: `search`, `country`, `gender`, `role`, `isActive`,
`page`, `limit`, `sortBy`, `sortOrder`.

All error responses follow: `{ "success": false, "message": "...", "errors": [...] }`.
All success responses follow: `{ "success": true, "data": {...} }`.

---

## 7. Switching to PostgreSQL or MySQL

1. In `server/prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"   // or "mysql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` in `.env` to your connection string, e.g.
   `postgresql://user:password@localhost:5432/business_app?schema=public`
3. Run `npx prisma migrate dev --name init` again to create the tables in the new database.

No other code changes are needed — the schema deliberately avoids database-specific
features so it works unmodified across SQLite/PostgreSQL/MySQL.

---

## 8. Security Notes

- **Password storage:** bcrypt hash only, 12 salt rounds.
- **SQL injection:** prevented structurally — every query goes through Prisma.
- **XSS:** `xss-clean` sanitizes body/query/params; React escapes output by default.
- **Rate limiting:** stricter limiter on `/auth/*`, general limiter on all `/api/*`.
- **Headers:** `helmet()` sets standard hardening headers.
- **HPP:** `hpp()` blocks HTTP parameter pollution.
- **CSRF:** this API is stateless — auth is via a `Bearer` token in the `Authorization`
  header, not a cookie, so it isn't subject to classic CSRF (which relies on a browser
  auto-attaching cookies). If you switch the token to a cookie, add a CSRF-token
  middleware to all state-changing routes.
- **Secrets:** all secrets are read from `.env`, never hard-coded.

## 9. Known Follow-ups for a Live Production Deployment

This codebase is functionally complete and secure for the specified requirements. A few
items are intentionally left as configuration rather than hard-coded, because they
depend on infrastructure you'll choose at deploy time:

- **Transactional email** (verification, password-reset links): the `nodemailer`
  dependency and reset-token flow are in place; wire in your SMTP/provider credentials
  in `.env` to activate outbound email.
- **File/avatar uploads**: `multer` is configured to store to `server/src/uploads`
  locally; for production, point this at S3/Cloud Storage instead of local disk.
- **HTTPS/TLS**: terminate TLS at your reverse proxy (Nginx/Caddy) or platform (Vercel/
  Render/Railway) — the app itself runs plain HTTP.

## 10. Deployment Outline

- **Frontend:** deploy `client/` to Vercel (native Next.js support) — set
  `NEXT_PUBLIC_API_URL` to your deployed API's URL.
- **Backend:** deploy `server/` to Render/Railway/Fly.io/a VPS. Provision a managed
  PostgreSQL instance, set `DATABASE_URL`, run `npx prisma migrate deploy`, then start
  with `npm start`.
- Set `NODE_ENV=production` and rotate `JWT_SECRET`/`JWT_REFRESH_SECRET` to strong
  random values distinct from any development secrets.
# Adwidereach
