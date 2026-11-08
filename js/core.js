(() => {
  const c = window.ES_CONFIG || {};

  const SAMPLE_EVENTS = [
    {
      title: "NextGen AI & Cloud Summit 2026",
      category: "Technology",
      event_mode: "offline",
      location: "Metropolitan Tech Pavilion, Hall 4, San Francisco",
      start_date: "2026-11-20",
      start_time: "09:30",
      end_date: "2026-11-20",
      end_time: "17:00",
      description: "Join 500+ tech visionaries, engineers, and startup founders for high-impact keynotes on autonomous agents, multimodal AI, edge acceleration, and live interactive demo labs.",
      cover_image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
      max_attendees: 300,
      registration_deadline: "2026-11-19",
      registration_enabled: true,
      status: "published"
    },
    {
      title: "Electric Sunset: Indie Music & Arts Fest",
      category: "Music",
      event_mode: "offline",
      location: "Sunset Pier Amphitheater, Bay Area Waterfront",
      start_date: "2026-11-28",
      start_time: "17:00",
      end_date: "2026-11-28",
      end_time: "23:00",
      description: "An open-air evening celebrating indie synth-pop, ambient soundscapes, digital light installations, food trucks, and unforgettable community vibes under the stars.",
      cover_image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
      max_attendees: 500,
      registration_deadline: "2026-11-27",
      registration_enabled: true,
      status: "published"
    },
    {
      title: "Design Systems & UI Engineering Lab",
      category: "Workshop",
      event_mode: "online",
      location: "Live Interactive Virtual Studio (Zoom)",
      start_date: "2026-12-05",
      start_time: "14:00",
      end_date: "2026-12-05",
      end_time: "17:30",
      description: "A comprehensive masterclass on crafting production-ready design tokens, accessible components, micro-animations, and syncing Figma variables directly with modern codebases.",
      cover_image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80",
      max_attendees: 80,
      registration_deadline: "2026-12-04",
      registration_enabled: true,
      status: "published"
    },
    {
      title: "Ignite Global Hackathon & Startup Pitch",
      category: "College fest",
      event_mode: "offline",
      location: "Innovation Hub & Creator Studio, Campus West Wing",
      start_date: "2026-12-14",
      start_time: "09:00",
      end_date: "2026-12-15",
      end_time: "18:00",
      description: "A 36-hour sprint where passionate student creators, designers, and developers turn bold ideas into working software and hardware prototypes with mentorship from industry founders.",
      cover_image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
      max_attendees: 200,
      registration_deadline: "2026-12-12",
      registration_enabled: true,
      status: "published"
    }
  ];

  const SAMPLE_REGS = [
    {
      participant_name: "Sarah Jenkins",
      email: "sarah.j@example.com",
      phone: "+1 (555) 234-5678",
      organization: "NovaLabs AI",
      registration_status: "attended"
    },
    {
      participant_name: "Marcus Vance",
      email: "marcus.v@techcorp.io",
      phone: "+1 (555) 987-6543",
      organization: "TechCorp Global",
      registration_status: "registered"
    },
    {
      participant_name: "Priya Sharma",
      email: "priya.s@soundwave.fm",
      phone: "+1 (555) 456-7890",
      organization: "SoundWave Collective",
      registration_status: "attended"
    },
    {
      participant_name: "Liam O'Connor",
      email: "liam@creativehub.co",
      phone: "+1 (555) 321-4321",
      organization: "Creative Hub",
      registration_status: "registered"
    },
    {
      participant_name: "Elena Rostova",
      email: "elena.r@designcraft.org",
      phone: "+1 (555) 678-1234",
      organization: "DesignCraft Studio",
      registration_status: "attended"
    },
    {
      participant_name: "David Kim",
      email: "dkim@stanford.edu",
      phone: "+1 (555) 890-5678",
      organization: "Stanford d.school",
      registration_status: "registered"
    },
    {
      participant_name: "Chloe Dubois",
      email: "chloe.d@innovate.fr",
      phone: "+33 6 12 34 56 78",
      organization: "Ecole 42",
      registration_status: "registered"
    }
  ];

  window.ES = {
    db: null,
    user: null,
    profile: null,
    demo: c.DEMO_MODE === true || !c.SUPABASE_URL || !c.SUPABASE_ANON_KEY,

    async init() {
      // 1. Initialize Supabase if credentials are present and not in pure demo mode
      if (window.supabase && c.SUPABASE_URL && c.SUPABASE_ANON_KEY && !c.DEMO_MODE) {
        try {
          if (!this.db) {
            this.db = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {
              auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false,
                lock: false
              }
            });
          }
          // Prevent any lock hanging with Promise.race
          let sessionPromise = this.db.auth.getSession();
          let timeoutPromise = new Promise(res => setTimeout(() => res({ data: {} }), 1000));
          let { data } = await Promise.race([sessionPromise, timeoutPromise]);
          this.user = data?.session?.user || null;

          if (this.user) {
            this.demo = false;
            try {
              let profPromise = this.db
                .from("profiles")
                .select("*")
                .eq("id", this.user.id)
                .maybeSingle();
              let profTimeout = new Promise(res => setTimeout(() => res({ data: null }), 800));
              let { data: prof } = await Promise.race([profPromise, profTimeout]);

              if (!prof) {
                let initialName = this.user.user_metadata?.full_name || this.deriveName(this.user.email);
                let upsertRes = await this.db.from("profiles").upsert({
                  id: this.user.id,
                  full_name: initialName,
                  email: this.user.email,
                  role: "organizer"
                }).select().maybeSingle();
                prof = upsertRes?.data || { id: this.user.id, full_name: initialName, email: this.user.email };
              }
              this.profile = prof;
            } catch (pErr) {
              console.warn("Profile fetch notice:", pErr);
            }
          }
        } catch (err) {
          console.warn("Supabase connection warning:", err);
        }
      }

      // 2. Fallback to localStorage if no active Supabase session
      if (!this.user) {
        this.user = JSON.parse(localStorage.getItem("es_user") || "null");
      }

      // Always ensure demo events and records are seeded so the platform is ready to explore
      this.seedDefaults();

      this.updateSidebarUser();
      return this.user;
    },

    seedDefaults() {
      const demoIds = ["demo-event-ai-summit", "demo-event-music-fest", "demo-event-ui-workshop", "demo-event-hackathon"];

      if (!localStorage.getItem("es_events")) {
        const seededEvents = SAMPLE_EVENTS.map((ev, idx) => ({
          ...ev,
          id: demoIds[idx] || ("demo-event-" + (idx + 1)),
          organizer_id: "demo",
          created_at: new Date(Date.now() - (idx + 1) * 86400000).toISOString()
        }));
        localStorage.setItem("es_events", JSON.stringify(seededEvents));
      }
      if (!localStorage.getItem("es_regs")) {
        const seededRegs = SAMPLE_REGS.map((rg, idx) => ({
          ...rg,
          id: "reg-" + (idx + 1),
          event_id: demoIds[idx % demoIds.length],
          registration_code: "ES-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
          created_at: new Date(Date.now() - idx * 86400000).toISOString()
        }));
        localStorage.setItem("es_regs", JSON.stringify(seededRegs));
      }
      let users = JSON.parse(localStorage.getItem("es_users") || "[]");
      if (!users.some(u => u.email === "demo@eventspark.io")) {
        users.push({
          id: "demo",
          name: "Demo Organizer",
          email: "demo@eventspark.io",
          password: "password123"
        });
        localStorage.setItem("es_users", JSON.stringify(users));
      }
    },

    deriveName(email = "") {
      if (!email) return "Organizer";
      const userpart = email.split("@")[0] || "";
      const parts = userpart.split(/[._\-+]/).filter(Boolean);
      if (!parts.length) return "Organizer";
      return parts
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(" ");
    },

    updateSidebarUser() {
      let avatar = document.getElementById("sidebar-avatar");
      let name = document.getElementById("sidebar-name");
      let email = document.getElementById("sidebar-email");

      let displayName =
        this.profile?.full_name ||
        this.user?.user_metadata?.full_name ||
        this.user?.name ||
        (this.user?.email ? this.deriveName(this.user.email) : "Organizer");

      let displayEmail =
        this.user?.email ||
        this.profile?.email ||
        "organizer@eventspark.io";

      if (avatar) {
        const words = displayName.trim().split(/\s+/).filter(Boolean);
        let initials = words[0] ? words[0].charAt(0).toUpperCase() : "O";
        if (words.length > 1 && words[1]) {
          initials += words[1].charAt(0).toUpperCase();
        }
        avatar.textContent = initials;
      }
      if (name) name.textContent = displayName;
      if (email) email.textContent = displayEmail;
    },

    async guard() {
      await this.init();
      if (!this.user) {
        // If not authenticated in Supabase and demo mode is off, redirect to login
        if (!this.demo) {
          location.href = "login.html";
          return false;
        }
        // Demo fallback
        let users = JSON.parse(localStorage.getItem("es_users") || "[]");
        let fallbackU = users[0] || {
          id: "demo",
          name: "Demo Organizer",
          email: "demo@eventspark.io"
        };
        localStorage.setItem("es_user", JSON.stringify(fallbackU));
        this.user = fallbackU;
        this.updateSidebarUser();
        return true;
      }
      return true;
    },

    async logout() {
      if (this.db) {
        try {
          await this.db.auth.signOut();
        } catch (e) {}
      }
      localStorage.removeItem("es_user");
      location.href = "index.html";
    },

    uid() {
      return this.user?.id || this.user?.email || "demo";
    },

    isUUID(val) {
      return typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    },

    // -------------------------------------------------------------
    // SETTINGS & PROFILE (SUPABASE PERSISTENCE)
    // -------------------------------------------------------------
    async getSettings() {
      await this.init();
      const currentName =
        this.profile?.full_name ||
        this.user?.user_metadata?.full_name ||
        this.user?.name ||
        (this.user?.email ? this.deriveName(this.user.email) : "Organizer");

      const currentEmail = this.user?.email || this.profile?.email || "";

      let settings = {
        name: currentName,
        email: currentEmail,
        organization: this.user?.user_metadata?.organization || "EventSpark",
        phone: this.user?.user_metadata?.phone || "",
        bio: this.user?.user_metadata?.bio || "Event creator and community organizer.",
        default_category: this.user?.user_metadata?.default_category || "Technology",
        default_mode: this.user?.user_metadata?.default_mode || "offline",
        email_notifications: this.user?.user_metadata?.email_notifications !== false,
        public_profile: this.user?.user_metadata?.public_profile !== false
      };
      return settings;
    },

    async saveSettings(data) {
      if (this.db && this.user && this.isUUID(this.user.id)) {
        try {
          // 1. Update Supabase Auth user metadata
          const metadataUpdate = {
            full_name: data.name,
            organization: data.organization || "",
            phone: data.phone || "",
            bio: data.bio || "",
            default_category: data.default_category || "Technology",
            default_mode: data.default_mode || "offline",
            email_notifications: data.email_notifications,
            public_profile: data.public_profile
          };

          await this.db.auth.updateUser({
            data: metadataUpdate
          });

          // 2. Update Supabase public.profiles table
          await this.db.from("profiles").upsert({
            id: this.user.id,
            full_name: data.name,
            email: this.user.email,
            role: "organizer"
          });
        } catch (syncErr) {
          console.warn("Supabase settings sync notice:", syncErr);
        }
      }

      // Also persist locally for fast responsiveness
      let settings = await this.getSettings();
      let updated = { ...settings, ...data };
      localStorage.setItem("es_settings", JSON.stringify(updated));

      if (this.user) {
        this.user.name = data.name;
        localStorage.setItem("es_user", JSON.stringify(this.user));
      }
      if (this.profile) {
        this.profile.full_name = data.name;
      }
      this.updateSidebarUser();
      return true;
    },

    async updatePassword(newPassword) {
      if (this.db && this.user) {
        let r = await this.db.auth.updateUser({ password: newPassword });
        if (r.error) throw r.error;
        return true;
      }
      throw Error("Password updates are only available when connected to Supabase.");
    },

    // -------------------------------------------------------------
    // SUPABASE DATA SYNC & CLOUD SEEDING
    // -------------------------------------------------------------
    async syncLocalToSupabase() {
      if (!this.db || !this.user) {
        throw Error("Please log in with your Supabase account first.");
      }

      const localEvents = JSON.parse(localStorage.getItem("es_events") || "[]");
      const localRegs = JSON.parse(localStorage.getItem("es_regs") || "[]");

      let eventsCount = 0;
      let regsCount = 0;
      const idMap = {}; // Maps local event id to Supabase generated id

      for (const ev of localEvents) {
        const payload = {
          title: ev.title,
          description: ev.description,
          category: ev.category || "Other",
          event_mode: ev.event_mode || "offline",
          location: ev.location || null,
          cover_image: ev.cover_image || null,
          start_date: ev.start_date,
          end_date: ev.end_date || null,
          start_time: ev.start_time || null,
          end_time: ev.end_time || null,
          registration_deadline: ev.registration_deadline || null,
          max_attendees: ev.max_attendees ? Number(ev.max_attendees) : null,
          registration_enabled: ev.registration_enabled !== false,
          status: ev.status || "published",
          organizer_id: this.user.id
        };

        let { data, error } = await this.db.from("events").insert(payload).select().single();
        if (error) {
          console.warn("Failed to insert event to Supabase:", error);
          continue;
        }
        if (data && ev.id) {
          idMap[ev.id] = data.id;
          eventsCount++;
        }
      }

      for (const rg of localRegs) {
        const newEventId = idMap[rg.event_id];
        if (!newEventId) continue;

        const regPayload = {
          event_id: newEventId,
          participant_name: rg.participant_name,
          email: rg.email,
          phone: rg.phone || null,
          organization: rg.organization || null,
          registration_status: rg.registration_status || "registered"
        };

        let { error } = await this.db.from("registrations").insert(regPayload);
        if (!error) regsCount++;
      }

      return { eventsCount, regsCount };
    },

    async seedCloudEvents() {
      if (!this.db || !this.user) {
        throw Error("Please log in with your Supabase account first.");
      }

      let count = 0;
      for (let i = 0; i < SAMPLE_EVENTS.length; i++) {
        const ev = SAMPLE_EVENTS[i];
        const payload = {
          title: ev.title,
          description: ev.description,
          category: ev.category,
          event_mode: ev.event_mode,
          location: ev.location,
          cover_image: ev.cover_image,
          start_date: ev.start_date,
          end_date: ev.end_date,
          start_time: ev.start_time,
          end_time: ev.end_time,
          registration_deadline: ev.registration_deadline,
          max_attendees: ev.max_attendees,
          registration_enabled: true,
          status: "published",
          organizer_id: this.user.id
        };

        let { data: newEv, error } = await this.db.from("events").insert(payload).select().single();
        if (error) {
          console.error("Cloud seed error:", error);
          continue;
        }

        // Add 2 attendees per event
        const sampleReg1 = SAMPLE_REGS[(i * 2) % SAMPLE_REGS.length];
        const sampleReg2 = SAMPLE_REGS[(i * 2 + 1) % SAMPLE_REGS.length];

        if (sampleReg1 && newEv) {
          await this.db.from("registrations").insert({
            event_id: newEv.id,
            participant_name: sampleReg1.participant_name,
            email: `sample${i}_1_${sampleReg1.email}`,
            phone: sampleReg1.phone,
            organization: sampleReg1.organization,
            registration_status: sampleReg1.registration_status
          });
        }
        if (sampleReg2 && newEv) {
          await this.db.from("registrations").insert({
            event_id: newEv.id,
            participant_name: sampleReg2.participant_name,
            email: `sample${i}_2_${sampleReg2.email}`,
            phone: sampleReg2.phone,
            organization: sampleReg2.organization,
            registration_status: sampleReg2.registration_status
          });
        }
        count++;
      }
      return count;
    },

    // -------------------------------------------------------------
    // EVENTS CRUD (SUPABASE / LOCAL)
    // -------------------------------------------------------------
    events() {
      let stored = JSON.parse(localStorage.getItem("es_events") || "[]");
      if (!stored.length) {
        this.seedDefaults();
        stored = JSON.parse(localStorage.getItem("es_events") || "[]");
      }
      return stored;
    },

    regs() {
      let stored = JSON.parse(localStorage.getItem("es_regs") || "[]");
      if (!stored.length) {
        this.seedDefaults();
        stored = JSON.parse(localStorage.getItem("es_regs") || "[]");
      }
      return stored;
    },

    saveE(x) {
      localStorage.setItem("es_events", JSON.stringify(x));
    },

    saveR(x) {
      localStorage.setItem("es_regs", JSON.stringify(x));
    },

    async getEvents() {
      if (this.db) {
        try {
          let q = this.db.from("events").select("*").order("created_at", { ascending: false });
          if (this.user && this.isUUID(this.user.id)) {
            q = q.eq("organizer_id", this.user.id);
          } else if (!this.user) {
            q = q.eq("status", "published");
          } else {
            // Non-UUID demo or local user: return local events
            return this.events();
          }
          let r = await q;
          if (!r.error && r.data) return r.data;
          if (r.error) console.warn("Supabase getEvents notice:", r.error);
        } catch (e) {
          console.warn("Supabase getEvents caught:", e);
        }
      }
      let all = this.events();
      let uid = this.uid();
      let userEvents = all.filter(x => x.organizer_id === uid || uid === "demo" || !x.organizer_id);
      return userEvents.length ? userEvents : all;
    },

    async getRegs() {
      if (this.db && this.user && this.isUUID(this.user.id)) {
        try {
          let r = await this.db
            .from("registrations")
            .select("*,events(title)")
            .order("created_at", { ascending: false });
          if (!r.error && r.data && r.data.length > 0) return r.data;
          if (r.error) console.warn("Supabase getRegs notice:", r.error);
        } catch (e) {
          console.warn("Supabase getRegs caught:", e);
        }
      }
      let myEvents = await this.getEvents();
      let eventIds = new Set(myEvents.map(e => e.id));
      let localRegs = this.regs().filter(r => eventIds.has(r.event_id));
      return localRegs.length ? localRegs : this.regs();
    },

    async saveEvent(v, id) {
      if (this.db && this.user && this.isUUID(this.user.id)) {
        try {
          const payload = {
            title: v.title,
            description: v.description,
            category: v.category || "Other",
            event_mode: v.event_mode || "offline",
            location: v.location || null,
            cover_image: v.cover_image || null,
            start_date: v.start_date,
            end_date: v.end_date || null,
            start_time: v.start_time || null,
            end_time: v.end_time || null,
            registration_deadline: v.registration_deadline || null,
            max_attendees: v.max_attendees ? Number(v.max_attendees) : null,
            registration_enabled: v.registration_enabled !== false,
            status: v.status || "published",
            organizer_id: this.user.id
          };

          let q = id && this.isUUID(id)
            ? this.db.from("events").update(payload).eq("id", id)
            : this.db.from("events").insert(payload);
          let r = await q.select().single();
          if (!r.error && r.data) {
            let a = this.events();
            a.unshift(r.data);
            this.saveE(a);
            return r.data;
          }
        } catch (dbErr) {
          console.warn("Supabase saveEvent error, saving locally:", dbErr);
        }
      }

      let a = this.events();
      if (id) {
        a = a.map(e => (e.id === id ? { ...e, ...v } : e));
      } else {
        let newEv = {
          ...v,
          id: "event-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
          organizer_id: this.uid(),
          created_at: new Date().toISOString()
        };
        a.unshift(newEv);
      }
      this.saveE(a);
      return true;
    },

    async deleteEvent(id) {
      if (this.db && this.isUUID(id)) {
        try {
          await this.db.from("events").delete().eq("id", id);
        } catch (err) {
          console.warn("deleteEvent notice:", err);
        }
      }
      this.saveE(this.events().filter(e => e.id !== id));
    },

    async publicEvent(id) {
      if (this.db) {
        try {
          if (id && this.isUUID(id)) {
            let r = await this.db
              .from("events")
              .select("*")
              .eq("id", id)
              .maybeSingle();
            if (!r.error && r.data) return r.data;
          } else if (!id) {
            let r = await this.db
              .from("events")
              .select("*")
              .eq("status", "published")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (!r.error && r.data) return r.data;
          }
        } catch (err) {}
      }
      let all = this.events();
      let found = all.find(e => e.id === id);
      if (!found && all.length > 0) {
        return all[0];
      }
      return found;
    },

    async getEventRegCount(eventId) {
      if (this.db && this.isUUID(eventId)) {
        try {
          let r = await this.db.rpc("get_event_reg_count", { p_event_id: eventId });
          if (!r.error && r.data !== null && r.data !== undefined) {
            return Number(r.data);
          }
        } catch (err) {}
      }
      return this.regs().filter(r => r.event_id === eventId).length;
    },

    async register(id, v) {
      if (this.db && this.isUUID(id)) {
        try {
          let r = await this.db.rpc("register_for_event", {
            p_event_id: id,
            p_name: v.participant_name,
            p_email: v.email,
            p_phone: v.phone || "",
            p_organization: v.organization || ""
          });
          if (!r.error && r.data) return r.data;
          if (r.error) console.warn("Supabase register notice:", r.error);
        } catch (err) {
          console.warn("Supabase register caught:", err);
        }
      }
      let e = this.events().find(x => x.id === id) || this.events()[0];
      let a = this.regs();
      if (a.some(x => x.event_id === id && x.email.toLowerCase() === v.email.toLowerCase())) {
        throw Error("This email is already registered for this event.");
      }
      if (e && e.max_attendees && a.filter(x => x.event_id === id).length >= e.max_attendees) {
        throw Error("Sorry, this event has reached maximum capacity.");
      }
      let r = {
        ...v,
        id: "reg-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
        event_id: id || e?.id || "demo-event-ai-summit",
        registration_code: "ES-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        registration_status: "registered",
        created_at: new Date().toISOString()
      };
      a.unshift(r);
      this.saveR(a);
      return r;
    },

    async status(id, s) {
      if (this.db && this.isUUID(id)) {
        try {
          let r = await this.db
            .from("registrations")
            .update({ registration_status: s })
            .eq("id", id);
          if (r.error) console.warn("Supabase attendee status update notice:", r.error);
        } catch (err) {}
      }
      this.saveR(this.regs().map(x => (x.id === id ? { ...x, registration_status: s } : x)));
    },

    esc(s = "") {
      return String(s).replace(
        /[&<>"']/g,
        c => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        })[c]
      );
    },

    date(s) {
      if (!s) return "Date TBA";
      try {
        const d = new Date(s + "T00:00:00");
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
      } catch (e) {
        return s;
      }
    },

    time(t) {
      if (!t) return "";
      try {
        let [h, m] = t.split(":");
        let hour = parseInt(h, 10);
        let ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        return `${hour}:${m} ${ampm}`;
      } catch (e) {
        return t;
      }
    },

    toast(msg, type = "info") {
      let c = document.getElementById("toast-container");
      if (!c) {
        c = document.createElement("div");
        c.id = "toast-container";
        document.body.appendChild(c);
      }
      let item = document.createElement("div");
      item.className = `toast-msg ${type}`;
      item.innerHTML = `<span>${this.esc(msg)}</span>`;
      c.appendChild(item);
      setTimeout(() => {
        item.style.opacity = "0";
        item.style.transform = "translateY(10px)";
        item.style.transition = "all 0.3s ease";
        setTimeout(() => item.remove(), 300);
      }, 3500);
    },

    getGoogleCalendarUrl(event) {
      let title = encodeURIComponent(event.title || "Event");
      let details = encodeURIComponent(event.description || "");
      let location = encodeURIComponent(event.location || "Online");
      let start = (event.start_date || "").replace(/-/g, "");
      let end = (event.end_date || event.start_date || "").replace(/-/g, "");
      let startTime = (event.start_time || "09:00").replace(/:/g, "") + "00";
      let endTime = (event.end_time || "17:00").replace(/:/g, "") + "00";
      let dates = `${start}T${startTime}Z/${end}T${endTime}Z`;
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    },

    downloadIcs(event) {
      let start = (event.start_date || "").replace(/-/g, "");
      let end = (event.end_date || event.start_date || "").replace(/-/g, "");
      let icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//EventSpark//Event Platform//EN",
        "BEGIN:VEVENT",
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${(event.description || "").replace(/\n/g, "\\n")}`,
        `LOCATION:${event.location || "Online"}`,
        `DTSTART:${start}T090000Z`,
        `DTEND:${end}T170000Z`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n");

      let blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      let link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute("download", `${(event.title || "event").toLowerCase().replace(/[^a-z0-9]/g, "-")}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    ES.init();
    document.getElementById("logout")?.addEventListener("click", () => ES.logout());
  });
})();
