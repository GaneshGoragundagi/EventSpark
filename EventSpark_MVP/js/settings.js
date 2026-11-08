document.addEventListener("DOMContentLoaded", async () => {
  if (!(await ES.guard())) return;

  const f = document.getElementById("settings");
  const m = document.getElementById("message");
  const passForm = document.getElementById("password-form");
  const passMsg = document.getElementById("pass-message");

  // Populate Cloud Status & User details
  const cloudUid = document.getElementById("cloud-uid");
  if (cloudUid && ES.user) {
    cloudUid.textContent = `User: ${ES.user.email || ES.user.id.slice(0, 8) + "..."}`;
  }

  // Load Settings from Supabase
  try {
    const s = await ES.getSettings();
    document.getElementById("set-name").value = s.name || "";
    document.getElementById("set-email").value = s.email || "";
    document.getElementById("set-org").value = s.organization || "";
    document.getElementById("set-phone").value = s.phone || "";
    document.getElementById("set-bio").value = s.bio || "";
    document.getElementById("set-cat").value = s.default_category || "Technology";
    document.getElementById("set-mode").value = s.default_mode || "offline";
    document.getElementById("set-notif").checked = s.email_notifications !== false;
    document.getElementById("set-public").checked = s.public_profile !== false;
  } catch (err) {
    console.warn("Could not load cloud settings:", err);
  }

  // Save Settings to Supabase
  f.onsubmit = async e => {
    e.preventDefault();
    m.style.display = "none";
    const saveBtn = f.querySelector("button[type='submit']");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving to Supabase...";
    }

    try {
      const data = {
        name: document.getElementById("set-name").value.trim(),
        organization: document.getElementById("set-org").value.trim(),
        phone: document.getElementById("set-phone").value.trim(),
        bio: document.getElementById("set-bio").value.trim(),
        default_category: document.getElementById("set-cat").value,
        default_mode: document.getElementById("set-mode").value,
        email_notifications: document.getElementById("set-notif").checked,
        public_profile: document.getElementById("set-public").checked
      };

      if (!data.name) throw Error("Name cannot be empty.");

      await ES.saveSettings(data);
      ES.toast("Settings saved to Supabase cloud! ☁", "success");
    } catch (x) {
      m.textContent = x.message;
      m.style.display = "block";
      m.className = "message error";
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Settings to Supabase ☁";
      }
    }
  };

  // Sync Local Events & Attendees to Supabase
  document.getElementById("btn-sync-supabase")?.addEventListener("click", async () => {
    try {
      ES.toast("Syncing local records to Supabase...", "info");
      const result = await ES.syncLocalToSupabase();
      ES.toast(`Synced ${result.eventsCount} events and ${result.regsCount} attendees to Supabase! 🚀`, "success");
    } catch (err) {
      ES.toast(err.message, "error");
    }
  });

  // Seed 4 Sample Events directly to Supabase Cloud
  document.getElementById("btn-seed-cloud")?.addEventListener("click", async () => {
    if (confirm("Seed 4 curated sample events and attendees directly into your Supabase database?")) {
      try {
        ES.toast("Writing sample events to Supabase...", "info");
        const count = await ES.seedCloudEvents();
        ES.toast(`Successfully seeded ${count} events into Supabase! 🎉`, "success");
      } catch (err) {
        ES.toast(err.message, "error");
      }
    }
  });

  // Clear Local Storage Cache
  document.getElementById("btn-clear-local")?.addEventListener("click", () => {
    if (confirm("Clear local browser cache? Your Supabase cloud records will remain untouched.")) {
      localStorage.removeItem("es_events");
      localStorage.removeItem("es_regs");
      ES.toast("Local browser storage cache cleared.", "info");
    }
  });

  // Password Update via Supabase Auth
  passForm?.addEventListener("submit", async ev => {
    ev.preventDefault();
    passMsg.style.display = "none";

    const newPass = passForm.new_password.value;
    const confirmPass = passForm.confirm_password.value;

    if (newPass !== confirmPass) {
      passMsg.textContent = "Passwords do not match.";
      passMsg.style.display = "block";
      passMsg.className = "message error";
      return;
    }

    try {
      await ES.updatePassword(newPass);
      passForm.reset();
      ES.toast("Password updated in Supabase Auth! 🔒", "success");
    } catch (err) {
      passMsg.textContent = err.message;
      passMsg.style.display = "block";
      passMsg.className = "message error";
    }
  });
});
