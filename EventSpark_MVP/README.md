# EventSpark — Modern Event Management & Ticketing Platform

EventSpark is a modern, high-performance web application designed for organizing, managing, and publishing events with real-time attendee tracking and analytics. Built with lightweight vanilla web standards and powered by PostgreSQL with Row-Level Security.

---

## ✨ Features

- **🎯 Event Lifecycle Management**: Create, customize, publish, and manage in-person, virtual, or hybrid events with ease.
- **🎟️ Real-Time Attendee Registration**: Fast ticket reservations with atomic capacity checks to prevent overbooking races.
- **📊 Interactive Analytics Dashboard**: Live visual breakdown of registrations, attendee statuses, and engagement metrics powered by Chart.js.
- **👥 Attendee Management**: Filter, search, track attendance (`registered`, `attended`, `cancelled`), and export attendee lists.
- **🔐 Flexible Authentication**: Seamless Supabase cloud authentication with automatic fallback to local offline mode.
- **🚀 Zero Build Step**: 100% standard HTML5, modern CSS3, and ES6+ JavaScript. No node_modules, bundlers, or complex build toolchains required.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Modern CSS3 (Custom Design System, Glassmorphism, CSS Grid & Flexbox), Vanilla JavaScript (ES6+)
- **Charts & Data Visualization**: Chart.js
- **Database & Auth**: Supabase (PostgreSQL, Row-Level Security (RLS), PL/pgSQL Stored Procedures)
- **Deployment**: Static Web Hosting (Vercel, Netlify, GitHub Pages, or Cloudflare Pages)

---

## 📁 Project Structure

```text
EventSpark/
├── assets/                  # Brand logos, icons, and image assets
├── css/
│   └── style.css            # Unified responsive CSS design system
├── js/
│   ├── config.js            # Client environment configuration
│   ├── core.js              # Core engine, Supabase data access, state sync
│   ├── auth.js              # Infallible login, signup, and session handlers
│   ├── dashboard.js         # Organizer overview & live event metrics
│   ├── events.js            # Event list & management
│   ├── create-event.js      # Multi-step event creation wizard
│   ├── attendees.js         # Attendee CRM & status management
│   ├── analytics.js         # Data visualization & reporting
│   ├── public-event.js      # Public event landing & registration page
│   └── settings.js          # Organizer profile & preference management
├── supabase/
│   └── schema.sql           # Complete PostgreSQL schema, RLS policies & RPCs
├── index.html               # Public platform landing page
├── login.html               # Organizer login portal
├── signup.html              # Organizer registration portal
├── dashboard.html           # Main organizer workspace
├── events.html              # Event catalog management
├── create-event.html        # New event editor
├── attendees.html           # Attendee roster & check-in
├── analytics.html           # Metrics & performance charts
├── settings.html            # Organizer profile settings
└── public-event.html        # Public-facing RSVP / ticket page
```

---

## 🚀 Quick Start (Local Development)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/EventSpark.git
cd EventSpark
```

### 2. Run the Application
Because EventSpark is a native web application, you do not need to install dependencies:
- **Using VS Code**: Right-click `index.html` → **Open with Live Server**.
- **Using Python**:
  ```bash
  python -m http.server 8000
  ```
- **Using Node.js**:
  ```bash
  npx serve .
  ```

Open `http://localhost:8000` in your browser.

---

## ☁️ Backend & Database Configuration (Optional)

EventSpark runs immediately out of the box with built-in demo data. To connect your own PostgreSQL cloud database:

### 1. Set Up Database Schema
1. Create a project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** in your project dashboard.
3. Copy the contents of `supabase/schema.sql` and run it. This creates:
   - `profiles` table with automatic user creation triggers
   - `events` table with Row-Level Security
   - `registrations` table with unique ticket code generation
   - `register_for_event` atomic transaction RPC with capacity locks
   - High-throughput database indexes

### 2. Configure Client Keys
In `js/config.js`, update your project credentials:

```javascript
window.ES_CONFIG = {
  SUPABASE_URL: "https://your-project-id.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-publishable-key",
  DEMO_MODE: false
};
```

> **Note**: For zero-configuration offline demonstration, set `DEMO_MODE: true`.

---

## 🌐 Production Deployment

Deploy EventSpark to any static hosting provider in seconds:

### Deploying to Vercel / Netlify
1. Connect your GitHub repository to **Vercel** or **Netlify**.
2. Set the build command to empty (no build step).
3. Set the output directory to root (`.`).
4. Click **Deploy**.

---

## 🔒 Security & Concurrency Design

- **Atomic Booking Protection**: Prevents double-booking race conditions during high-volume registration rushes via row-level PostgreSQL locks.
- **Row-Level Security (RLS)**: Enforces tenant isolation so organizers can only read and modify their own events and attendees.
- **Input Sanitization**: Prevents script injection on public RSVP submissions.
- **Double-Click Throttling**: Submit buttons disable immediately upon submission to prevent accidental duplicate requests.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
