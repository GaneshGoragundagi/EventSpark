document.addEventListener("DOMContentLoaded", async () => {
  if (!(await ES.guard())) return;

  const f = document.getElementById("event-form");
  const m = document.getElementById("message");
  const pageTitle = document.getElementById("page-title");
  const id = new URLSearchParams(location.search).get("id");

  // Elements for Live Preview
  const prevTitle = document.getElementById("prev-title");
  const prevDesc = document.getElementById("prev-desc");
  const prevImg = document.getElementById("prev-img");
  const prevCat = document.getElementById("prev-cat");
  const prevLoc = document.getElementById("prev-loc");
  const prevTime = document.getElementById("prev-time");
  const prevDay = document.getElementById("prev-day");
  const prevMonth = document.getElementById("prev-month");

  function getCategoryClass(cat = "") {
    let c = cat.toLowerCase();
    if (c.includes("tech")) return "category-tech";
    if (c.includes("music")) return "category-music";
    if (c.includes("workshop")) return "category-workshop";
    return "category-fest";
  }

  function updateLivePreview() {
    const titleVal = f.elements.title.value.trim() || "Your Event Title";
    const descVal = f.elements.description.value.trim() || "Event description will appear here as you type...";
    const catVal = f.elements.category.value || "Technology";
    const modeVal = f.elements.event_mode.value;
    const coverVal = f.elements.cover_image.value.trim() || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80";
    const locVal = f.elements.location.value.trim() || (modeVal === "online" ? "Virtual Online Stream" : "In Person Venue");
    const dateVal = f.elements.start_date.value;
    const timeVal = f.elements.start_time.value;

    if (prevTitle) prevTitle.textContent = titleVal;
    if (prevDesc) prevDesc.textContent = descVal.slice(0, 110) + (descVal.length > 110 ? "..." : "");
    if (prevImg) prevImg.src = coverVal;

    if (prevCat) {
      prevCat.textContent = catVal.toUpperCase();
      prevCat.className = `pill-badge ${getCategoryClass(catVal)}`;
    }

    if (prevLoc) {
      prevLoc.textContent = modeVal === "online" ? `🌐 ${locVal}` : `📍 ${locVal.split(",")[0] || "Venue"}`;
    }

    if (prevTime) {
      prevTime.textContent = timeVal ? `· ${ES.time(timeVal)}` : "";
    }

    if (dateVal && prevDay && prevMonth) {
      try {
        const d = new Date(dateVal + "T00:00:00");
        prevDay.textContent = d.getDate();
        prevMonth.textContent = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      } catch (e) {}
    }
  }

  // Cover presets
  const presetBtns = document.querySelectorAll(".cover-preset-btn");
  presetBtns.forEach(btn => {
    btn.onclick = () => {
      presetBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      f.elements.cover_image.value = btn.dataset.url;
      updateLivePreview();
    };
  });

  // Attach input listeners for live updates
  ["input-title", "input-desc", "input-category", "input-mode", "input-cover", "input-location", "input-start-date", "input-start-time"].forEach(inputId => {
    const el = document.getElementById(inputId);
    if (el) {
      el.addEventListener("input", updateLivePreview);
      el.addEventListener("change", updateLivePreview);
    }
  });

  // Edit Mode Loading
  if (id) {
    if (pageTitle) pageTitle.textContent = "Edit Event";
    let events = await ES.getEvents();
    let ev = events.find(x => x.id === id);
    if (ev) {
      Object.entries(ev).forEach(([k, v]) => {
        let x = f.elements[k];
        if (x) {
          if (x.type === "checkbox") x.checked = !!v;
          else x.value = v ?? "";
        }
      });
      // Check preset matching
      presetBtns.forEach(b => {
        if (b.dataset.url === ev.cover_image) b.classList.add("active");
        else b.classList.remove("active");
      });
      updateLivePreview();
    }
  }

  async function save(status) {
    const submitBtn = f.querySelector("button[type='submit']");
    const draftBtn = document.getElementById("draft");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Saving..."; }
    if (draftBtn) draftBtn.disabled = true;

    try {
      m.style.display = "none";
      let v = Object.fromEntries(new FormData(f));
      v.status = status;
      v.organizer_id = ES.uid();
      v.registration_enabled = f.elements.registration_enabled.checked;
      v.max_attendees = v.max_attendees ? Number(v.max_attendees) : null;

      if (!v.title || !v.description || !v.start_date) {
        throw Error("Please fill in the required fields: Title, Description, and Start Date.");
      }

      await ES.saveEvent(v, id);
      ES.toast(status === "published" ? "Event published successfully! 🎉" : "Draft saved! 📋", "success");
      setTimeout(() => (location.href = "events.html"), 600);
    } catch (e) {
      m.textContent = e.message;
      m.style.display = "block";
      m.className = "message error";
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Publish Event ↗"; }
      if (draftBtn) draftBtn.disabled = false;
    }
  }

  f.onsubmit = e => {
    e.preventDefault();
    save("published");
  };

  document.getElementById("draft").onclick = () => save("draft");
});
