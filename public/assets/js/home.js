// Public community home: load published schools, their metrics, and events.
(function () {
  async function loadSchools() {
    const box = document.getElementById("school-list");
    try {
      const schools = await SCP.communitySchools();
      document.getElementById("stat-schools").textContent = schools.length;
      box.innerHTML = "";
      if (!schools.length) {
        box.innerHTML = "<p class='muted'>No schools have published profiles yet. Schools publish from their staff workspace.</p>";
        return;
      }
      let metricCount = 0;
      for (const school of schools) {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML =
          (school.image_url
            ? "<img src='" + school.image_url + "' alt='' loading='lazy' style='width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin-bottom:10px' />"
            : "") +
          "<h3>" + school.name + " <span class='badge'><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><polyline points='20 6 9 17 4 12'/></svg> verified</span></h3>" +
          "<p class='muted' style='margin:0 0 6px'>" +
          school.school_type.replace(/_/g, " ") + " · " + school.state +
          (school.lga ? " · " + school.lga : "") + "</p>";
        box.appendChild(card);

        try {
          const metrics = await SCP.schoolMetrics(school.slug);
          metricCount += metrics.length;
          if (metrics.length) {
            const ul = document.createElement("p");
            ul.className = "muted";
            ul.style.fontSize = "13px";
            ul.textContent = metrics.map(function (m) {
              return m.metric_type.replace(/_/g, " ") + " (" + m.period + "): " +
                Math.round(m.value) + (m.value_unit === "percent" ? "%" : " " + m.value_unit);
            }).join(" · ");
            card.appendChild(ul);
          }
        } catch (_) { /* school with no metrics: fine */ }
        document.getElementById("stat-metrics").textContent = metricCount;
      }
    } catch (e) {
      box.innerHTML = "<p class='error'>Could not load schools: " + e.message + "</p>";
    }
  }

  async function loadEvents() {
    const box = document.getElementById("event-list");
    try {
      const events = await SCP.upcomingEvents();
      document.getElementById("stat-events").textContent = events.length;
      box.innerHTML = "";
      if (!events.length) {
        box.innerHTML = "<p class='muted'>No upcoming community events yet.</p>";
        return;
      }
      events.forEach(function (ev) {
        const row = document.createElement("div");
        row.className = "card";
        const when = new Date(ev.starts_at);
        row.innerHTML =
          "<h3>" + ev.title + " <span class='badge'>" + ev.school_slug + "</span></h3>" +
          "<p class='muted' style='margin:0'>" +
          (ev.category ? ev.category + " · " : "") +
          when.toDateString() + " " + when.toLocaleTimeString() + "</p>";
        box.appendChild(row);
      });
    } catch (e) {
      box.innerHTML = "<p class='error'>Could not load events: " + e.message + "</p>";
    }
  }

  loadSchools();
  loadEvents();
})();
