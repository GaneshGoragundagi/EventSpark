document.addEventListener("DOMContentLoaded", async () => {
  if (!(await ES.guard())) return;

  let [regs, events] = await Promise.all([ES.getRegs(), ES.getEvents()]);
  const rows = document.getElementById("rows");
  const q = document.getElementById("search");
  const f = document.getElementById("event-filter");
  const statusFilter = document.getElementById("status-filter");

  // Populate event dropdown
  f.innerHTML =
    '<option value="all">All Events</option>' +
    events.map(e => `<option value="${e.id}">${ES.esc(e.title)}</option>`).join("");

  function updateStats() {
    const total = regs.length;
    const attended = regs.filter(r => r.registration_status === "attended").length;
    const pending = regs.filter(r => r.registration_status === "registered").length;
    const rate = total ? Math.round((attended / total) * 100) : 0;

    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-attended").textContent = attended;
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-rate").textContent = `${rate}% checked-in`;
  }

  function draw() {
    updateStats();
    const term = (q.value || "").toLowerCase().trim();
    const eventId = f.value;
    const statusVal = statusFilter ? statusFilter.value : "all";

    const filtered = regs.filter(r => {
      const matchSearch =
        (r.participant_name || "").toLowerCase().includes(term) ||
        (r.email || "").toLowerCase().includes(term) ||
        (r.registration_code || "").toLowerCase().includes(term) ||
        (r.phone || "").toLowerCase().includes(term);

      const matchEvent = eventId === "all" || r.event_id === eventId;
      const matchStatus = statusVal === "all" || r.registration_status === statusVal;

      return matchSearch && matchEvent && matchStatus;
    });

    if (!filtered.length) {
      rows.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--muted);">
            No attendees match the selected search or filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    rows.innerHTML = filtered
      .map(r => {
        const ev = events.find(e => e.id === r.event_id);
        const evTitle = r.events?.title || ev?.title || "Event";
        const initial = (r.participant_name || "A").charAt(0).toUpperCase();
        const code = r.registration_code || "ES-" + r.id.slice(0, 5).toUpperCase();
        const isAttended = r.registration_status === "attended";

        return `
          <tr>
            <td>
              <div class="attendee-cell">
                <div class="avatar-sm">${initial}</div>
                <div>
                  <div style="font-weight: 700; color: var(--ink);">${ES.esc(r.participant_name)}</div>
                  <div style="font-size: 11.5px; color: var(--muted);">${ES.esc(r.email)}</div>
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
            <td style="color: var(--muted); font-size: 12.5px;">${ES.esc(r.phone || "—")}</td>
            <td>
              <span class="pill-badge status-${r.registration_status || "registered"}">
                ${ES.esc(r.registration_status || "registered")}
              </span>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                ${
                  isAttended
                    ? `<span style="font-size: 12px; color: var(--success); font-weight: 700;">✓ Checked-In</span>`
                    : `<button class="btn btn-primary sm" data-checkin="${r.id}">Check In</button>`
                }
                <select data-id="${r.id}" style="width: auto; padding: 4px 8px; font-size: 11.5px; margin: 0;">
                  <option value="registered" ${r.registration_status === "registered" ? "selected" : ""}>Registered</option>
                  <option value="attended" ${r.registration_status === "attended" ? "selected" : ""}>Attended</option>
                  <option value="cancelled" ${r.registration_status === "cancelled" ? "selected" : ""}>Cancelled</option>
                </select>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    // Quick 1-click check-in button
    rows.querySelectorAll("[data-checkin]").forEach(b => {
      b.onclick = async () => {
        const id = b.dataset.checkin;
        await ES.status(id, "attended");
        const item = regs.find(x => x.id === id);
        if (item) item.registration_status = "attended";
        ES.toast(`Marked ${item?.participant_name || "Guest"} as Attended! ✓`, "success");
        draw();
      };
    });

    // Dropdown status selector change
    rows.querySelectorAll("select[data-id]").forEach(s => {
      s.onchange = async () => {
        const id = s.dataset.id;
        const newStatus = s.value;
        await ES.status(id, newStatus);
        const item = regs.find(x => x.id === id);
        if (item) item.registration_status = newStatus;
        ES.toast(`Status updated to ${newStatus}`, "info");
        draw();
      };
    });
  }

  q.oninput = draw;
  f.onchange = draw;
  if (statusFilter) statusFilter.onchange = draw;

  // CSV Export
  document.getElementById("export").onclick = () => {
    if (!regs.length) {
      ES.toast("No attendee records available to export.", "error");
      return;
    }
    const csv = [
      ["Name", "Email", "Phone", "Organization", "Event Title", "Ticket Code", "Status", "Date Registered"],
      ...regs.map(r => {
        const ev = events.find(e => e.id === r.event_id);
        return [
          r.participant_name,
          r.email,
          r.phone || "",
          r.organization || "",
          r.events?.title || ev?.title || "Event",
          r.registration_code || "",
          r.registration_status || "registered",
          r.created_at ? new Date(r.created_at).toLocaleDateString() : ""
        ];
      })
    ]
      .map(row => row.map(cell => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eventspark-attendees-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ES.toast("Attendees CSV downloaded successfully! 📊", "success");
  };

  draw();
});
