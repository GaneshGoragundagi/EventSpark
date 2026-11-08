document.addEventListener("DOMContentLoaded", async () => {
  if (!(await ES.guard())) return;

  const [events, regs] = await Promise.all([ES.getEvents(), ES.getRegs()]);
  const publishedEvents = events.filter(x => x.status === "published");

  // Basic Metrics
  const totalRegs = regs.length;
  const attendedCount = regs.filter(x => x.registration_status === "attended").length;
  const cancelledCount = regs.filter(x => x.registration_status === "cancelled").length;
  const pendingCount = regs.filter(x => x.registration_status === "registered" || !x.registration_status).length;
  const rate = totalRegs ? Math.round((attendedCount / totalRegs) * 100) : 0;
  const avg = events.length ? (totalRegs / events.length).toFixed(1) : 0;

  document.getElementById("total").textContent = totalRegs;
  document.getElementById("published").textContent = publishedEvents.length;
  document.getElementById("rate").textContent = `${rate}%`;
  document.getElementById("avg-regs").textContent = avg;

  // Key Takeaways
  if (events.length) {
    const eventCounts = events.map(e => ({
      title: e.title,
      category: e.category,
      count: regs.filter(r => r.event_id === e.id).length
    }));
    eventCounts.sort((a, b) => b.count - a.count);

    const topEventEl = document.getElementById("top-event");
    if (topEventEl && eventCounts[0]) {
      topEventEl.textContent = `${eventCounts[0].title} (${eventCounts[0].count} regs)`;
    }

    const catCounts = {};
    events.forEach(e => {
      const cat = e.category || "General";
      catCounts[cat] = (catCounts[cat] || 0) + regs.filter(r => r.event_id === e.id).length;
    });
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    const topCatEl = document.getElementById("top-cat");
    if (topCatEl && topCat) {
      topCatEl.textContent = `${topCat[0]} (${topCat[1]} attendees)`;
    }
  }

  // Chart 1: Bar Chart (Registrations by Event)
  const chartCanvas = document.getElementById("chart");
  if (window.Chart && chartCanvas && events.length) {
    const labels = events.map(x => (x.title.length > 18 ? x.title.slice(0, 18) + "..." : x.title));
    const data = events.map(x => regs.filter(y => y.event_id === x.id).length);

    new Chart(chartCanvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Registrations",
            data: data,
            backgroundColor: "rgba(255, 51, 102, 0.8)",
            hoverBackgroundColor: "#ff3366",
            borderRadius: 8,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0, font: { family: "'Plus Jakarta Sans'" } },
            grid: { color: "rgba(226, 232, 240, 0.6)" }
          },
          x: {
            ticks: { font: { family: "'Plus Jakarta Sans'", size: 11 } },
            grid: { display: false }
          }
        }
      }
    });
  }

  // Chart 2: Status Breakdown Doughnut Chart
  const statusCanvas = document.getElementById("statusChart");
  if (window.Chart && statusCanvas) {
    new Chart(statusCanvas, {
      type: "doughnut",
      data: {
        labels: ["Attended", "Registered (Pending)", "Cancelled"],
        datasets: [
          {
            data: [attendedCount, pendingCount, cancelledCount],
            backgroundColor: ["#10b981", "#6366f1", "#f43f5e"],
            borderWidth: 2,
            borderColor: "#ffffff"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 12,
              font: { family: "'Plus Jakarta Sans'", size: 12, weight: "600" }
            }
          }
        },
        cutout: "68%"
      }
    });
  }
});
