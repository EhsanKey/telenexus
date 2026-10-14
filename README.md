# TeleNexus

> **The Telegram Personal Intelligence & Contact Management Platform**  
> Turn your Telegram into a powerful, structured personal CRM with zero message persistence and cloud synchronization.

---

## 🌟 Key Highlights

- **Native Telegram MTProto Client:** Direct user-account MTProto integration via GramJS (Layer 198) with full 2FA cloud password and proxy support.
- **Dedicated CRM Profiles for All Entities:** Attach custom display names, verified/unverified phone numbers, company details, job titles, relationship contexts, multiline notes, and external social links to any private chat (PV), basic group, supergroup, or broadcast channel.
- **Master Passcode Dashboard Security:** Cryptographically protects your workspace with `scrypt` hashing (16-byte random salt, 64-byte key) so no unauthorized browser or secondary device can view your Telegram chats even when a session is active on the server.
- **Infinite Scroll & Dialog Pagination:** Smooth, on-demand progressive loading across all conversation categories (All, PV, Groups, Supergroups, Channels, Archived).
- **Interactive Tag Taxonomy & Filtering:** Color-coded tag pills with instant one-click filtering in the conversation list.
- **Dynamic Username Auto-Update:** Automatically tracks and syncs changing Telegram `@usernames` in your custom profiles whenever chats are opened.
- **Google Drive Backup & Live Excel Sync:** Syncs unencrypted `TeleNexus-CRM-Contacts.xlsx` to Google Drive for editing in Google Sheets, alongside AES-256-GCM encrypted disaster-recovery archives.
- **Zero Message Persistence Invariant:** Telegram messages are fetched transiently for ephemeral viewing only — **never stored in the database, application logs, or disk.**

---

## 🏗️ Architecture & Universal Invariants

| Subsystem | Directory | Tech Stack | Dev Port | Route Prefix |
|---|---|---|---|---|
| **Backend Core** | [`backend/`](backend/) | Node.js, Express, GramJS, Drizzle ORM, Neon PostgreSQL | `4000` | `http://localhost:4000/api/v1` |
| **Frontend Web** | [`frontend/`](frontend/) | Next.js 15+ (App Router), React 19, Tailwind CSS | `3000` | Proxy `/api/backend/*` ➔ `:4000` |
| **Living Specs** | [`specs/`](specs/) | Markdown SSOT Catalog (`SPEC-01` to `SPEC-09`) | N/A | Single Source of Truth |

### Universal Invariants

1. **Telegram Owns Telegram Data — TeleNexus Owns User Metadata:** Under no circumstances are messages persisted in Neon PostgreSQL or disk.
2. **Reverse Proxy Network Enclosure:** Browser clients never communicate directly with backend port `4000`; all requests are routed via Next.js Route Handlers (`/api/backend/*`).
3. **Universal Response Envelope:** All endpoints return `{ success: true, data: ... }` or `{ success: false, error: { code, message, fields } }`.
4. **Strict TypeScript & Zero `any`:** Strict typing enforced with runtime Zod schema validation across all DTOs.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js** >= 20.x
- **pnpm** >= 9.x
- A **Neon PostgreSQL** database ([neon.tech](https://neon.tech))
- Telegram **API ID** and **API Hash** ([my.telegram.org](https://my.telegram.org))
- *(Optional)* Google Cloud OAuth 2.0 Client credentials for Google Drive backups

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/your-username/telenexus.git
cd telenexus

# Install workspace dependencies
pnpm install
```

### 3. Environment Configuration

Copy the example environment files:

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env.local
```

Edit `backend/.env` with your credentials:
```env
PORT=4000
DATABASE_URL=postgresql://username:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_SECRET=your_32_byte_secret_key_here
FRONTEND_URL=http://localhost:3000
```

### 4. Running Locally

```bash
# Start both Backend and Frontend in development mode
pnpm run dev

# Or run separately:
pnpm --filter backend run dev   # Runs on http://localhost:4000
pnpm --filter frontend run dev  # Runs on http://localhost:3000
```

Access the application in your browser at: **`http://localhost:3000`**

---

## 🧪 Testing & Quality Gate

```bash
# Execute full unit, integration, and invariant test suites (106 tests)
pnpm run test

# Type-check and compile all projects
pnpm run build

# Run linter
pnpm run lint
```

---

## 🔒 Security & Privacy

- **Session Encryption:** MTProto session strings are encrypted with AES-256-GCM at rest.
- **Master Passcode:** Local workstation access protected with scrypt password hashing.
- **Google Drive Least Privilege:** Uses restricted scope `https://www.googleapis.com/auth/drive.file`.
- **Sanitized Error Handling:** Stack traces and internal database errors are redacted from API responses.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
