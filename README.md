<p align="center">
  <img src="public/logo.png" alt="GateGuard Logo" width="80" height="80" />
</p>

<h1 align="center">Gate Guard</h1>

<p align="center">
  Smart subdivision gate management system for Sabang Dexterville Subdivision.
  <br />
  QR-based visitor entry, real-time notifications, and instant homeowner approval.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E" alt="Supabase" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4" alt="Tailwind" />
</p>

---

## Overview

GateGuard is a full-stack web application that digitizes the visitor management process for gated subdivisions. Visitors register online, receive a one-time QR code, and present it to the guard at the gate. The guard scans it, the homeowner gets notified instantly via SMS/email, and approves or denies entry all in real time.

### Key Features

- **QR-Based Entry** — Visitors get a unique, one-time-use QR code valid for 24 hours
- **Real-Time Notifications** — SMS, email, and in-app alerts when visitors arrive and leave
- **Guard Confirmation** — Guards confirm entry and exit at the gate with a two-step process
- **Homeowner Approval** — Homeowners approve or deny visitors from their phone
- **Admin Dashboard** — Full system oversight with analytics, logs, and user management
- **Brute Force Protection** — Rate-limited login with 15-minute lockout after 5 failed attempts
- **Role-Based Access** — Three roles (admin, guard, homeowner) with row-level security

---

## System Flow

### 1. Visitor Registration

```
Visitor opens /visit (no login required)
        |
        v
Fills in: Name, Phone, Purpose, Vehicle Plate, Homeowner, Proof Photo
        |
        v
Receives a unique QR code (valid 24 hours, one-time use)
        |
        v
Downloads QR pass with visitor info and expiry date
        |
        v
Shows QR code to guard at the gate
```

### 2. Gate Entry

```
Guard scans QR code at the gate
        |
        v
System validates QR (not expired, not used, not denied)
        |
        v
Homeowner receives instant SMS + Email + In-app notification
        |
        v
Homeowner approves or denies from their dashboard
        |
        v
Guard sees real-time status update (green/red flash animation)
        |
        v
Guard taps "Confirm Entry" --> entry_time recorded
        |
        v
Visitor enters the subdivision
```

### 3. Gate Exit

```
Guard scans the same QR code again
        |
        v
System detects visitor is inside (has entry_time, no exit_time)
        |
        v
Guard taps "Confirm Exit" --> exit_time recorded
        |
        v
Homeowner notified via SMS + Email + In-app
        |
        v
QR code is permanently consumed (cannot be reused)
```

### 4. Homeowner Registration

```
New homeowner registers at /register
        |
        v
Provides: Name, Email, Phone, Block/Lot, Valid ID, Password
        |
        v
Receives email confirmation link
        |
        v
Clicks link --> email verified
        |
        v
Admin reviews and approves/rejects the registration
        |
        v
Homeowner notified via SMS + Email
        |
        v
Can now sign in and manage visitors
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email/Password) |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui + Base UI |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| QR Code | qrcode.react (generate) + jsQR (scan) |
| Notifications | Brevo (SMS + Email) |
| Real-time | Supabase Realtime |
| Deployment | Vercel |

---

## Database Schema

### Tables

**profiles** — User accounts (extends Supabase auth.users)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | References auth.users |
| email | text | User email |
| full_name | text | Display name |
| phone | text | Philippine format (09XX) |
| role | enum | `admin` / `guard` / `homeowner` |
| status | enum | `pending` / `active` / `rejected` |
| block | text | Block assignment (homeowners) |
| lot | text | Lot assignment (homeowners) |
| proof_of_id_urls | jsonb | Uploaded ID photos (array, max 5) |
| avatar_url | text | Profile picture |
| email_confirmed | boolean | Email verification status |

**visitors** — Registered visitors with QR codes

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| name | text | Visitor name |
| phone | text | Visitor phone |
| purpose | text | Reason for visit |
| vehicle_plate | text | Vehicle plate number |
| homeowner_id | UUID (FK) | Which homeowner they're visiting |
| qr_code | text (unique) | Generated QR token |
| proof_urls | jsonb | Visitor proof photos (array, max 5) |
| status | enum | `registered` / `pending` / `approved` / `denied` |
| denial_reason | text | Why entry was denied |
| expires_at | timestamptz | QR expiry (24h default) |

**visit_logs** — Gate entry/exit records

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| visitor_id | UUID (FK) | Which visitor |
| guard_id | UUID (FK) | Which guard scanned |
| entry_time | timestamptz | When guard confirmed entry |
| exit_time | timestamptz | When guard confirmed exit |

**blocks_lots** — Subdivision block/lot inventory

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| block | text | e.g. "Block 1" |
| lot | text | e.g. "Lot 5" |
| is_occupied | boolean | Occupancy status |
| occupied_by | UUID (FK) | Homeowner profile ID |

**notifications** — In-app notifications

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| user_id | UUID (FK) | Recipient |
| title | text | Notification title |
| message | text | Notification body |
| type | enum | `visitor_at_gate` / `visitor_approved` / `visitor_denied` / `visitor_exited` / `registration_approved` / `registration_rejected` |
| related_visitor_id | UUID (FK) | Associated visitor |
| is_read | boolean | Read status |

### Relationships

```
profiles (homeowner)
    |--- visitors (homeowner_id)
    |       |--- visit_logs (visitor_id)
    |
    |--- visit_logs (guard_id)  [as guard]
    |
    |--- blocks_lots (occupied_by)
    |
    |--- notifications (user_id)
```

### Row Level Security

All tables use **RLS** with a `get_my_role()` SECURITY DEFINER function:

- **Homeowners** — read/manage their own visitors and notifications
- **Guards** — read all visitors, create/update visit logs, read homeowner profiles
- **Admins** — full read/write access to all tables
- **Public** — read available blocks/lots, look up visitors by QR code

---

## API Routes

### Authentication

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Rate-limited login (5 attempts / 15 min lockout) |
| GET | `/auth/callback` | Supabase auth callback (email confirm, password reset) |

### Visitor Operations

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/visitors` | Create visitor + generate QR code |
| GET | `/api/homeowners/search` | Search homeowners by name |
| GET | `/api/blocks-lots` | Available blocks/lots (for registration) |

### Guard Operations

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/guard/scan` | Scan QR code at gate |
| PATCH | `/api/guard/confirm` | Confirm entry or exit |
| GET | `/api/guard/dashboard` | Guard's today's scan data |

### Admin Operations

| Method | Route | Description |
|--------|-------|-------------|
| GET/POST | `/api/admin/guards` | List / create guards |
| PATCH/DELETE | `/api/admin/guards/[id]` | Update / delete guard |
| PATCH/DELETE | `/api/admin/homeowners/[id]` | Approve/reject/delete homeowner |
| GET/POST/DELETE | `/api/admin/blocks-lots` | CRUD blocks & lots (bulk supported) |
| DELETE | `/api/admin/logs` | Bulk delete visit logs |

---

## Pages

### Public

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/visit` | Visitor check-in (no auth required) |

### Auth

| Route | Description |
|-------|-------------|
| `/login` | Sign in (rate-limited) |
| `/register` | Homeowner registration |
| `/forgot-password` | Request password reset |
| `/reset-password` | Set new password |
| `/email-confirmed` | Email verification success |

### Guard

| Route | Description |
|-------|-------------|
| `/guard/dashboard` | QR scanner, scan queue, entry/exit confirmation |
| `/guard/profile` | Profile settings |

### Homeowner

| Route | Description |
|-------|-------------|
| `/homeowner/dashboard` | Stats, notifications |
| `/homeowner/visitors` | Pending visitors — approve/deny |
| `/homeowner/history` | Visit history |
| `/homeowner/profile` | Profile settings |

### Admin

| Route | Description |
|-------|-------------|
| `/admin/dashboard` | System overview with charts |
| `/admin/homeowners` | Manage homeowner accounts |
| `/admin/guards` | Manage guard accounts |
| `/admin/logs` | All visit activity logs |
| `/admin/blocks-lots` | Block & lot inventory |
| `/admin/settings` | Admin profile settings |

---

## QR Code Security

| Protection | Description |
|-----------|-------------|
| One-time use | QR code consumed after a complete visit (entry + exit) |
| 24-hour expiry | Automatically expires after generation |
| Denied = blocked | Denied visitors cannot reuse their QR code |
| Duplicate protection | Cannot create multiple visit logs for the same QR |
| Guard confirmation | Entry and exit both require explicit guard action |

---

## Notification System

| Event | In-App | SMS | Email |
|-------|--------|-----|-------|
| Visitor at gate | Yes | Yes | Yes |
| Visitor approved | Realtime | — | — |
| Visitor denied | Realtime | — | — |
| Visitor exited | Yes | Yes | Yes |
| Registration approved | Yes | Yes | Yes |
| Registration rejected | Yes | Yes | Yes |
| Password reset | — | — | Yes |
| Email confirmation | — | — | Yes |

---

## Form Validation

All forms use **Zod** schemas:

| Field | Validation |
|-------|-----------|
| Phone | Philippine format: `09XX XXX XXXX` or `+63XXXXXXXXXX` |
| Vehicle plate | Philippine format: `ABC 1234` |
| Password | Min 8 chars, uppercase + lowercase + number required |
| Name | 2–100 characters |
| Email | Valid email format |
| Purpose | 3–500 characters |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Brevo account (optional, for SMS/email)

### Environment Variables

Create `.env.local`:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL (required for email links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Brevo notifications (optional)
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=noreply@gateguard.com
BREVO_SENDER_NAME=GateGuard
BREVO_SMS_SENDER=GateGuard
```

### Installation

```bash
# Clone the repository
git clone https://github.com/s0crateX/GateGuard.git
cd GateGuard

# Install dependencies
npm install

# Start development server
npm run dev
```

### Supabase Setup

1. Create a new Supabase project
2. Run all migrations from `supabase/migrations/` in order
3. Create storage buckets:
   - `proof-of-id` (public access)
   - `visitor-proof` (public access)
   - `avatars` (public access)
4. Add your site URL to **Authentication > URL Configuration > Redirect URLs**
5. Enable Realtime for tables: `visitors`, `visit_logs`, `notifications`, `profiles`, `blocks_lots`

### Create Admin User

After creating a user via Supabase Auth dashboard, run in SQL Editor:

```sql
UPDATE profiles
SET role = 'admin', status = 'active'
WHERE email = 'your-admin@email.com';
```

---

## Project Structure

```
gateguard/
├── app/
│   ├── (admin)/              # Admin layout + pages
│   ├── (auth)/               # Auth layout (login, register, etc.)
│   ├── (guard)/              # Guard layout + pages
│   ├── (homeowner)/          # Homeowner layout + pages
│   ├── (visitor)/            # Visitor portal layout + pages
│   ├── api/                  # API routes
│   │   ├── admin/            # Admin endpoints
│   │   ├── auth/             # Login with rate limiting
│   │   ├── guard/            # Scan, confirm, dashboard
│   │   ├── homeowners/       # Homeowner search
│   │   ├── visitors/         # Visitor creation
│   │   └── blocks-lots/      # Public blocks/lots
│   ├── auth/callback/        # Supabase auth callback
│   └── error.tsx             # Global error boundary
├── components/
│   ├── admin/                # Admin components + charts
│   ├── guard/                # QR scanner, queue cards
│   ├── shared/               # Logo, status badge, file upload
│   ├── ui/                   # shadcn/ui components
│   └── visitor/              # Homeowner search, QR display
├── hooks/
│   └── use-realtime.ts       # Supabase realtime hook
├── lib/
│   ├── supabase/             # Client configs (admin, client, server)
│   ├── brevo.ts              # SMS/email service
│   ├── email-templates.ts    # HTML email templates
│   ├── qr.ts                 # QR token generation
│   ├── rate-limit.ts         # Brute force protection
│   ├── routes.ts             # Dashboard routing
│   └── validations.ts        # Zod schemas
├── public/
│   ├── illustrations/        # Storyset illustrations
│   └── logo.png              # GateGuard logo
├── supabase/
│   └── migrations/           # 8 database migrations
└── types/
    └── index.ts              # TypeScript interfaces
```

---

## Deployment

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel deploy --prod
```

Checklist:
1. Set all environment variables in Vercel dashboard
2. Add Vercel domain to Supabase **Redirect URLs**
3. Run database migrations on Supabase
4. Create storage buckets with public access
5. Enable Realtime on required tables

---

## License

This project is developed for Sabang Dexterville Subdivision.
