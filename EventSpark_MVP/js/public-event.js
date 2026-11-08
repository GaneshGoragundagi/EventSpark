document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("public");
  const shareBtn = document.getElementById("btn-share-page");
  const id = new URLSearchParams(location.search).get("id");

  if (shareBtn) {
    shareBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        ES.toast("Event link copied to clipboard! 📋", "success");
      } catch (err) {
        prompt("Copy this event link:", location.href);
      }
    };
  }

  try {
    await ES.init();
    let e = await ES.publicEvent(id);
    if (!e) throw Error("Event not found or registration is currently closed.");

    document.title = `${e.title} — EventSpark`;

    const regCount = await ES.getEventRegCount(e.id);
    const maxCapacity = e.max_attendees;
    const isFull = maxCapacity && regCount >= maxCapacity;
    const isRegistrationEnabled = e.registration_enabled !== false;
    const coverUrl = e.cover_image || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80";
    const isOnline = e.event_mode === "online";
    const googleCalUrl = ES.getGoogleCalendarUrl(e);

    function getCategoryClass(cat = "") {
      let c = (cat || "").toLowerCase();
      if (c.includes("tech")) return "category-tech";
      if (c.includes("music")) return "category-music";
      if (c.includes("workshop")) return "category-workshop";
      return "category-fest";
    }

    const catClass = getCategoryClass(e.category);

    root.innerHTML = `
      <div class="public-hero-card">
        <!-- Left: Event Cover & Details -->
        <div class="public-cover-section" style="background-image: url('${ES.esc(coverUrl)}');">
          <div class="public-cover-overlay"></div>
          <div class="public-cover-content">
            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
              <span class="pill-badge ${catClass}">${ES.esc(e.category || "Featured Event")}</span>
              <span class="pill-badge" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3);">
                ${isOnline ? "🌐 Virtual Event" : "📍 In Person"}
              </span>
            </div>
            <h1>${ES.esc(e.title)}</h1>
            <div style="display: flex; align-items: center; gap: 14px; font-size: 14px; color: #e2e8f0; font-weight: 600;">
              <span>🗓️ ${ES.date(e.start_date)}</span>
              ${e.start_time ? `<span>⏰ ${ES.time(e.start_time)}${e.end_time ? " – " + ES.time(e.end_time) : ""}</span>` : ""}
            </div>
          </div>
        </div>

        <!-- Right: Registration Panel -->
        <div class="public-info-section" id="reg-container">
          <div>
            <div style="margin-bottom: 20px;">
              <h2 style="font-size: 24px; margin-bottom: 6px;">Reserve Your Spot</h2>
              <p style="font-size: 13.5px; color: var(--muted); margin: 0;">
                Free admission · Instant digital ticket pass generated.
              </p>
            </div>

            <!-- Event Details Cards -->
            <div class="event-details-bar">
              <div class="detail-item">
                <div class="detail-icon">🗓️</div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 700;">Date & Time</div>
                  <div>${ES.date(e.start_date)}${e.start_time ? " at " + ES.time(e.start_time) : ""}</div>
                </div>
              </div>

              <div class="detail-item">
                <div class="detail-icon">📍</div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 700;">Location / Platform</div>
                  <div>${ES.esc(e.location || (isOnline ? "Virtual Event (Link upon registration)" : "Venue TBA"))}</div>
                </div>
              </div>

              <div class="detail-item">
                <div class="detail-icon">👥</div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 700;">Availability</div>
                  <div><b>${regCount}</b> people registered ${maxCapacity ? `(Limit: ${maxCapacity})` : ""}</div>
                </div>
              </div>
            </div>

            <!-- About Section -->
            <div style="margin-bottom: 24px;">
              <h3 style="font-size: 16px; margin-bottom: 8px;">About this Event</h3>
              <p style="font-size: 14px; color: var(--ink-secondary); line-height: 1.65; white-space: pre-line;">
                ${ES.esc(e.description)}
              </p>
            </div>

            <!-- Registration Form or Status -->
            ${
              !isRegistrationEnabled
                ? `<div style="padding: 18px; background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); color: #d97706; font-weight: 600; font-size: 14px; text-align: center;">Registration is currently closed for this event.</div>`
                : isFull
                ? `<div style="padding: 18px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: var(--radius-md); color: #e11d48; font-weight: 600; font-size: 14px; text-align: center;">This event has reached full capacity.</div>`
                : `
                <form id="reg-form" style="border-top: 1px solid var(--line); padding-top: 20px;">
                  <label>
                    Full Name *
                    <input name="participant_name" placeholder="Alex Morgan" required />
                  </label>
                  <label>
                    Email Address *
                    <input name="email" type="email" placeholder="alex@example.com" required />
                  </label>
                  <div class="two">
                    <label>
                      Phone Number
                      <input name="phone" type="tel" placeholder="+1 (555) 000-0000" />
                    </label>
                    <label>
                      College / Organization
                      <input name="organization" placeholder="e.g. Stanford / Acronym" />
                    </label>
                  </div>
                  <button type="submit" class="btn btn-gradient full big" style="margin-top: 20px;">
                    Claim Your Free Ticket ↗
                  </button>
                  <p id="msg" class="message" style="display: none;"></p>
                </form>
              `
            }
          </div>
        </div>
      </div>
    `;

    // Registration Submission Handler
    const regForm = document.getElementById("reg-form");
    if (regForm) {
      regForm.onsubmit = async ev => {
        ev.preventDefault();
        const m = document.getElementById("msg");
        m.style.display = "none";
        const submitBtn = regForm.querySelector("button[type='submit']");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Reserving Your Ticket...";
        }

        try {
          const formData = Object.fromEntries(new FormData(regForm));
          const regResult = await ES.register(e.id, formData);
          const ticketCode = regResult.registration_code || "ES-" + regResult.id.slice(0, 6).toUpperCase();

          // Generate clean SVG QR Matrix
          const qrSvg = generateQrSvg(ticketCode);

          // Replace form with gorgeous Digital Ticket Pass
          const regContainer = document.getElementById("reg-container");
          regContainer.innerHTML = `
            <div class="ticket-pass">
              <div class="ticket-header">
                <span class="pill-badge status-attended">✓ CONFIRMED TICKET PASS</span>
                <h2 style="font-size: 22px; margin: 12px 0 6px;">You're in, ${ES.esc(formData.participant_name)}! 🎉</h2>
                <p style="font-size: 13px; color: var(--muted); margin: 0;">Show this pass at check-in or present your code.</p>
              </div>

              <div style="text-align: center; margin: 16px 0;">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--muted); font-weight: 700; letter-spacing: 0.08em;">TICKET REFERENCE CODE</div>
                <div class="ticket-code">${ES.esc(ticketCode)}</div>
              </div>

              <div class="ticket-qr">
                ${qrSvg}
              </div>

              <div style="background: #f8fafc; border-radius: var(--radius-md); padding: 14px; text-align: left; font-size: 13px; margin: 18px 0; border: 1px solid var(--line);">
                <div style="font-weight: 700; color: var(--ink); margin-bottom: 4px;">${ES.esc(e.title)}</div>
                <div style="color: var(--muted);">🗓️ ${ES.date(e.start_date)} ${e.start_time ? "· " + ES.time(e.start_time) : ""}</div>
                <div style="color: var(--muted);">📍 ${ES.esc(e.location || "Online")}</div>
                <div style="color: var(--muted); margin-top: 4px;">👤 ${ES.esc(formData.participant_name)} (${ES.esc(formData.email)})</div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                <a class="btn btn-primary full" href="${googleCalUrl}" target="_blank">
                  🗓️ Add to Google Calendar
                </a>
                <div style="display: flex; gap: 10px;">
                  <button class="btn ghost full" id="btn-download-ics">
                    📥 Download .ICS
                  </button>
                  <button class="btn ghost full" onclick="window.print()">
                    🖨️ Print Pass
                  </button>
                </div>
              </div>
            </div>
          `;

          document.getElementById("btn-download-ics").onclick = () => {
            ES.downloadIcs(e);
            ES.toast("Calendar file downloaded!", "success");
          };

          ES.toast("Registration confirmed! See you at the event. 🎟️", "success");
        } catch (x) {
          m.textContent = x.message;
          m.style.display = "block";
          m.className = "message error";
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Claim Your Free Ticket ↗";
          }
        }
      };
    }
  } catch (err) {
    root.innerHTML = `
      <div style="text-align: center; padding: 80px 20px; background: white; border-radius: var(--radius-xl); border: 1px solid var(--line); box-shadow: var(--shadow-md);">
        <div style="font-size: 48px; margin-bottom: 16px;">🎟️</div>
        <h2>Event Unavailable</h2>
        <p style="color: var(--muted); max-width: 440px; margin: 0 auto 24px;">${ES.esc(err.message)}</p>
        <a class="btn btn-gradient" href="index.html">← Browse Other Events</a>
      </div>
    `;
  }

  // Generates clean SVG QR Code representation
  function generateQrSvg(code) {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = (hash << 5) - hash + code.charCodeAt(i);
      hash |= 0;
    }
    const size = 17;
    let rects = "";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isCorner =
          (r < 4 && c < 4) ||
          (r < 4 && c > size - 5) ||
          (r > size - 5 && c < 4);
        const bit = ((hash >> ((r * size + c) % 31)) & 1) === 1;
        if (isCorner || bit) {
          rects += `<rect x="${c * 7}" y="${r * 7}" width="6" height="6" fill="#0f172a" rx="1.5" />`;
        }
      }
    }
    return `<svg viewBox="0 0 119 119" width="100%" height="100%">${rects}</svg>`;
  }
});
