document.addEventListener("DOMContentLoaded", async () => {
  if (!(await ES.guard())) return;

  const root = document.getElementById("event-list");
  const q = document.getElementById("search");
  const f = document.getElementById("filter");
  const catFilter = document.getElementById("category-filter");

  let [allEvents, allRegs] = await Promise.all([ES.getEvents(), ES.getRegs()]);

  function getCategoryClass(cat = "") {
    let c = cat.toLowerCase();
    if (c.includes("tech")) return "category-tech";
    if (c.includes("music")) return "category-music";
    if (c.includes("workshop")) return "category-workshop";
    return "category-fest";
  }

  function getDateBadge(dateStr) {
    if (!dateStr) return { day: "TBA", month: "DATE" };
    try {
      const d = new Date(dateStr + "T00:00:00");
      const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      const day = d.getDate();
      return { day, month };
    } catch (e) {
      return { day: "TBA", month: "DATE" };
    }
  }

  function draw() {
    const term = (q.value || "").toLowerCase().trim();
    const statusVal = f.value;
    const catVal = catFilter ? catFilter.value : "all";

    const filtered = allEvents.filter(e => {
      const matchSearch =
        (e.title || "").toLowerCase().includes(term) ||
        (e.location || "").toLowerCase().includes(term) ||
        (e.category || "").toLowerCase().includes(term);

      const matchStatus = statusVal === "all" || e.status === statusVal;
      const matchCategory = catVal === "all" || e.category === catVal;

      return matchSearch && matchStatus && matchCategory;
    });

    if (!filtered.length) {
      root.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: white; border: 1px dashed var(--line); border-radius: var(--radius-xl);">
          <div style="font-size: 40px; margin-bottom: 12px;">🎪</div>
          <h3 style="margin-bottom: 8px;">No events found</h3>
          <p style="color: var(--muted); max-width: 400px; margin: 0 auto 20px;">Try adjusting your search criteria or create a brand new event.</p>
          <a class="btn btn-gradient" href="create-event.html">＋ Create an Event</a>
        </div>
      `;
      return;
    }

    root.innerHTML = filtered
      .map(e => {
        const dateBadge = getDateBadge(e.start_date);
        const catClass = getCategoryClass(e.category);
        const regCount = allRegs.filter(r => r.event_id === e.id).length;
        const max = e.max_attendees ? ` / ${e.max_attendees}` : "";
        const coverUrl = e.cover_image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80";
        const isOnline = e.event_mode === "online";
        const publicUrl = new URL(`public-event.html?id=${e.id}`, location.href).href;

        return `
          <article class="eventcard">
            <div class="card-cover-wrap">
              <img src="${ES.esc(coverUrl)}" alt="${ES.esc(e.title)}" loading="lazy" />
              <div class="card-badges">
                <div class="card-date-badge">
                  <span class="day">${dateBadge.day}</span>
                  <span class="month">${dateBadge.month}</span>
                </div>
                <div style="display: flex; gap: 6px;">
                  <span class="pill-badge status-${e.status}">${ES.esc(e.status)}</span>
                  <span class="pill-badge ${catClass}">${ES.esc(e.category || "Event")}</span>
                </div>
              </div>
            </div>

            <div class="card-body">
              <div class="card-meta">
                <span>${isOnline ? "🌐 Virtual Event" : "📍 " + ES.esc(e.location?.split(",")[0] || "In Person")}</span>
                ${e.start_time ? `<span>· ${ES.time(e.start_time)}</span>` : ""}
              </div>

              <h3>${ES.esc(e.title)}</h3>
              <p>${ES.esc((e.description || "").slice(0, 105))}${e.description && e.description.length > 105 ? "..." : ""}</p>

              <div style="font-size: 12px; color: var(--muted); font-weight: 600; margin-bottom: 14px;">
                👥 <b>${regCount}</b>${max} registered
              </div>

              <div class="card-footer" style="gap: 8px; flex-wrap: wrap;">
                <div style="display: flex; gap: 8px;">
                  <a class="btn ghost sm" href="public-event.html?id=${e.id}" target="_blank" title="View Public Event Page">
                    👁️ View
                  </a>
                  <button class="btn ghost sm" data-share="${publicUrl}" title="Copy Public Registration Link">
                    🔗 Share
                  </button>
                  <button class="btn ghost sm" data-edit="${e.id}" title="Edit Event Details">
                    ✏️ Edit
                  </button>
                </div>
                <button class="btn btn-danger-ghost sm" data-del="${e.id}" title="Delete Event">
                  🗑️
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    // Wire Share Links
    root.querySelectorAll("[data-share]").forEach(b => {
      b.onclick = async () => {
        try {
          await navigator.clipboard.writeText(b.dataset.share);
          ES.toast("Public link copied to clipboard! 📋", "success");
        } catch (err) {
          prompt("Copy this public registration URL:", b.dataset.share);
        }
      };
    });

    // Wire Edit Buttons
    root.querySelectorAll("[data-edit]").forEach(b => {
      b.onclick = () => (location.href = "create-event.html?id=" + b.dataset.edit);
    });

    // Wire Delete Buttons
    root.querySelectorAll("[data-del]").forEach(b => {
      b.onclick = async () => {
        if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
          await ES.deleteEvent(b.dataset.del);
          allEvents = await ES.getEvents();
          ES.toast("Event deleted successfully", "info");
          draw();
        }
      };
    });
  }

  q.oninput = draw;
  f.onchange = draw;
  if (catFilter) catFilter.onchange = draw;

  draw();
});
