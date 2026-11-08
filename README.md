
# EventSpark — Event Experience Platform

High-performance, modern event management platform built with HTML5, modern CSS3, vanilla JavaScript (ES6+), Chart.js, and Supabase (PostgreSQL with Row Level Security & connection pooling).


---


## 🚀 Quick Run (Local)

1. Open the folder in VS Code.
2. Right click `index.html` → **Open with Live Server** (or run `python -m http.server 8000`).
3. Open `http://localhost:8000` in your browser.


## ☁️ Supabase Production Setup (Ready for 1,000+ Concurrent Users)


### 1. Database Schema & RPC

1. In your **Supabase Dashboard**, open the **SQL Editor**.
2. Paste and run [`supabase/schema.sql`](supabase/schema.sql).
   - This sets up `profiles`, `events`, and `registrations` with Row Level Security (RLS).
   - Adds atomic locking on capacity to prevent overbooking races.
   - Creates indexes on `organizer_id`, `status`, `start_date`, and `email` for high-throughput concurrency.

### 2. Instant User Login & Auto-Confirmation

To allow users to sign up and immediately log in without waiting for email verification links:

1. Go to **Authentication** → **Providers** → **Email** in your Supabase Dashboard.
2. Toggle **OFF** **"Confirm email"**.
3. Click **Save**.

### 3. Client Configuration

Check [`js/config.js`](js/config.js):

```javascript
window.ES_CONFIG = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-publishable-key",
  DEMO_MODE: false,
};
```

_(Your active Supabase credentials are already pre-configured)._

---

## 🌐 Deploy to Production (Vercel / Netlify / Cloudflare Pages)

1. Push this folder to a GitHub repository.
2. Import the repository into **Vercel** or **Netlify** as a **Static Site** (no build command needed, publish directory is root `.`).
3. In your **Supabase Dashboard** → **Authentication** → **URL Configuration**:
   - Set **Site URL** to your production domain (e.g., `https://your-event-spark.vercel.app`).
   - Add `https://your-event-spark.vercel.app/**` to **Redirect URLs**.

---

## 🔒 1,000 Concurrent Users Architecture Checklist

- **Atomic Concurrency**: `register_for_event` uses PostgreSQL `FOR UPDATE` row-level locks on event capacity checks to prevent double-booking or overcapacity races under high concurrent traffic.
- **Double-Click Protection**: All registration and form submission buttons disable instantly upon click to prevent duplicate payloads.
- **Data Isolation**: Multi-tenant Row Level Security (RLS) guarantees that organizers only see and edit their own private drafts and registrations.
- **Clean Indexing**: `events_owner_idx`, `events_status_idx`, `events_start_date_idx`, and `regs_email_idx` optimize lookups across thousands of simultaneous sessions.
- **Dynamic Profile Syncing**: When any user logs in, their actual full name and email are synced to their profile and reflected across all workspace sidebars and headers.
