document.addEventListener("DOMContentLoaded", async () => {
  // Rotating headline keywords with smooth transition
  const words = ["experiences.", "communities.", "festivals.", "memories.", "moments."];
  let i = 0;
  const rotatingEl = document.getElementById("rotating");
  if (rotatingEl) {
    setInterval(() => {
      rotatingEl.style.opacity = "0";
      rotatingEl.style.transform = "translateY(8px)";
      rotatingEl.style.transition = "all 0.25s ease";
      setTimeout(() => {
        i = (i + 1) % words.length;
        rotatingEl.textContent = words[i];
        rotatingEl.style.opacity = "1";
        rotatingEl.style.transform = "translateY(0)";
      }, 250);
    }, 2800);
  }

  await ES.init();

  let events = [];
  if (ES.db) {
    try {
      let r = await ES.db
        .from("events")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(6);
      events = r.data || [];
    } catch (e) {
      console.warn("DB fetch error fallback to local:", e);
    }
  }

  if (!events.length) {
    events = ES.events().filter(e => e.status === "published").slice(0, 6);
  }

  const root = document.getElementById("featured");
  if (!root) return;

  if (!events.length) {
    root.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--muted); padding: 40px 0;">No featured events published yet. Be the first to create one!</p>`;
    return;
  }

  const allRegs = ES.regs();

  function getCategoryClass(cat = "") {
    let c = cat.toLowerCase();
    if (c.includes("tech")) return "category-tech";
    if (c.includes("music")) return "category-music";
    if (c.includes("workshop")) return "category-workshop";
    return "category-fest";
  }

  function getDateBadge(dateStr) {
    if (!dateStr) return { day: "20", month: "NOV" };
    try {
      const d = new Date(dateStr + "T00:00:00");
      const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      const day = d.getDate();
      return { day, month };
    } catch (e) {
      return { day: "TBA", month: "DATE" };
    }
  }

  root.innerHTML = events
    .map(e => {
      const dateBadge = getDateBadge(e.start_date);
      const catClass = getCategoryClass(e.category);
      const regCount = allRegs.filter(r => r.event_id === e.id).length;
      const coverUrl = e.cover_image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80";
      const isOnline = e.event_mode === "online";

      return `
        <article class="eventcard">
          <div class="card-cover-wrap">
            <img src="${ES.esc(coverUrl)}" alt="${ES.esc(e.title)}" loading="lazy" />
            <div class="card-badges">
              <div class="card-date-badge">
                <span class="day">${dateBadge.day}</span>
                <span class="month">${dateBadge.month}</span>
              </div>
              <span class="pill-badge ${catClass}">${ES.esc(e.category || "EVENT")}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="card-meta">
              <span>${isOnline ? "🌐 Virtual Event" : "📍 " + ES.esc(e.location?.split(",")[0] || "In Person")}</span>
              ${e.start_time ? `<span>· ${ES.time(e.start_time)}</span>` : ""}
            </div>
            <h3>${ES.esc(e.title)}</h3>
            <p>${ES.esc((e.description || "").slice(0, 115))}${e.description && e.description.length > 115 ? "..." : ""}</p>
            <div class="card-footer">
              <div class="card-attendees-info">
                <span>👥 <b>${regCount}</b> registered</span>
              </div>
              <a class="btn btn-primary sm" href="public-event.html?id=${e.id}">
                Get Tickets ↗
              </a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
});
