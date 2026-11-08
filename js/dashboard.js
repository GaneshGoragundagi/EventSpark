document.addEventListener("DOMContentLoaded", async () => {
  if (!(await ES.guard())) return;

  const [events, regs] = await Promise.all([ES.getEvents(), ES.getRegs()]);

  // Personalized Greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const userName =
    ES.profile?.full_name ||
    ES.user?.user_metadata?.full_name ||
    ES.user?.name ||
    (ES.user?.email ? ES.deriveName(ES.user.email) : "Organizer");
  const welcomeEl = document.getElementById("welcome");
  if (welcomeEl) {
    welcomeEl.textContent = `${timeGreeting}, ${userName} 👋`;
  }

  // Stats Counters
  document.getElementById("events-count").textContent = events.length;
  document.getElementById("regs-count").textContent = regs.length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(x => (x.start_date || "") >= todayStr && x.status === "published");
  document.getElementById("upcoming-count").textContent = upcoming.length;

  const attended = regs.filter(x => x.registration_status === "attended").length;
  document.getElementById("attended-count").textContent = attended;

  const attendedRateEl = document.getElementById("attended-rate");
  if (attendedRateEl) {
    const rate = regs.length ? Math.round((attended / regs.length) * 100) : 0;
    attendedRateEl.textContent = `Live rate: ${rate}% checked-in`;
  }

  // Recent Registrations Table
  const tbody = document.getElementById("recent");
  if (!tbody) return;

  if (!regs.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--muted);">No registrations recorded yet. Share your event links to start receiving attendees!</td></tr>`;
    return;
  }

  function renderTable() {
    tbody.innerHTML = regs
      .slice(0, 8)
      .map(x => {
        const ev = events.find(y => y.id === x.event_id);
        const evTitle = x.events?.title || ev?.title || "Special Event";
        const initial = (x.participant_name || "A").charAt(0).toUpperCase();
        const code = x.registration_code || "ES-" + x.id.slice(0, 5).toUpperCase();
        const isAttended = x.registration_status === "attended";

        return `
          <tr>
            <td>
              <div class="attendee-cell">
                <div class="avatar-sm">${initial}</div>
                <div>
                  <div style="font-weight: 700; color: var(--ink);">${ES.esc(x.participant_name)}</div>
                  <div style="font-size: 11.5px; color: var(--muted);">${ES.esc(x.email)}</div>
                </div>
              </div>
            </td>
            <td>
              <span style="font-weight: 600;">${ES.esc(evTitle)}</span>
            </td>
            <td>
              <span style="font-family: monospace; font-size: 12px; font-weight: 700; background: #f1f5f9; padding: 3px 8px; border-radius: 6px;">
                ${ES.esc(code)}
              </span>
            </td>
            <td>
              <span class="pill-badge status-${x.registration_status}">
                ${ES.esc(x.registration_status || "registered")}
              </span>
            </td>
            <td>
              ${
                isAttended
                  ? `<span style="font-size: 12px; color: var(--success); font-weight: 600;">✓ Checked-In</span>`
                  : `<button class="btn ghost sm" data-checkin="${x.id}">Mark Attended</button>`
              }
            </td>
          </tr>
        `;
      })
      .join("");

    tbody.querySelectorAll("[data-checkin]").forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.checkin;
        await ES.status(id, "attended");
        const target = regs.find(r => r.id === id);
        if (target) target.registration_status = "attended";
        ES.toast("Attendee marked as Attended!", "success");
        renderTable();
      };
    });
  }

  renderTable();
});
