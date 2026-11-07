/* EduRise Study Tracker — timetable, goals, streaks, timer. Data stays on the student's device. */
(function () {
  var DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function load(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function today() { return new Date().toISOString().slice(0, 10); }

  /* ---------- Timetable ---------- */
  var tt = load("edurise-timetable", []);
  var FULL = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" };
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function renderTT() {
    var box = document.getElementById("tt-list");
    if (!box) return;
    box.innerHTML = "";
    if (!tt.length) {
      box.innerHTML = '<div class="tt-empty"><b>No classes yet</b><span>Add your first period below, or upload your timetable file.</span></div>';
      save("edurise-timetable", tt);
      return;
    }
    var todayKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
    DAYS.forEach(function (day) {
      var rows = tt.filter(function (e) { return e.day === day; })
        .sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
      if (!rows.length) return;
      var group = document.createElement("div");
      group.className = "tt-day" + (day === todayKey ? " is-today" : "");
      var head = '<div class="tt-day-head"><b>' + FULL[day] + "</b>" +
        (day === todayKey ? '<span class="tt-pill">Today</span>' : "") +
        '<span class="tt-count">' + rows.length + (rows.length === 1 ? " class" : " classes") + "</span></div>";
      var html = head;
      rows.forEach(function (e) {
        var i = tt.indexOf(e);
        html += '<div class="tt-row"><div class="tt-time"><b>' + esc(e.start) + "</b><span>" + esc(e.end) + "</span></div>" +
          '<div class="tt-subj">' + esc(e.subject) + "</div>" +
          '<button type="button" class="tt-del" data-del="' + i + '" aria-label="Remove ' + esc(e.subject) + '">' +
          "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' aria-hidden='true'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg></button></div>";
      });
      group.innerHTML = html;
      box.appendChild(group);
    });
    save("edurise-timetable", tt);
    if (typeof drawToday === "function") drawToday();
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-del]");
    if (!b) return;
    tt.splice(parseInt(b.getAttribute("data-del"), 10), 1);
    renderTT();
  });
  document.getElementById("tt-add") && document.getElementById("tt-add").addEventListener("click", function () {
    var d = document.getElementById("tt-day").value, s = document.getElementById("tt-start").value,
        e = document.getElementById("tt-end").value, sub = document.getElementById("tt-subject").value.trim();
    if (!d || !s || !e || !sub) return alert("Please fill in day, start, end and subject.");
    if (e <= s) return alert("End time must be after start time.");
    tt.push({ day: d, start: s, end: e, subject: sub });
    document.getElementById("tt-subject").value = "";
    renderTT();
  });

  document.getElementById("tt-clear") && document.getElementById("tt-clear").addEventListener("click", function () {
    if (confirm("Clear the whole timetable? This cannot be undone.")) { tt = []; renderTT(); }
  });

  /* file upload: .txt / .csv — lines like "Mon, 08:00, 08:45, Maths" */
  document.getElementById("tt-file") && document.getElementById("tt-file").addEventListener("change", function (ev) {
    var f = ev.target.files[0];
    if (!f) return;
    var dzName = document.getElementById("dz-name");
    if (dzName) dzName.textContent = f.name;
    if (f.size > 200000) return alert("File too large (max 200KB).");
    var r = new FileReader();
    r.onload = function () {
      var added = 0;
      String(r.result).split(/\r?\n/).forEach(function (line) {
        var p = line.split(",").map(function (x) { return x.trim(); });
        if (p.length >= 4 && DAYS.indexOf(p[0]) > -1 && p[3]) {
          tt.push({ day: p[0], start: p[1], end: p[2], subject: p[3] }); added++;
        }
      });
      if (added) {
        renderTT();
        if (dzName) { dzName.textContent = "Added " + added + (added === 1 ? " period" : " periods");
          setTimeout(function () { if (dzName) dzName.textContent = f.name; }, 2500); }
      } else {
        alert('No rows found. Format each line as: Mon, 08:00, 08:45, Maths');
        if (dzName) dzName.textContent = "No file chosen";
      }
      ev.target.value = "";
    };
    r.readAsText(f);
  });

  /* ---------- Goals ---------- */
  var goals = load("edurise-goals", []);
  function renderGoals() {
    var box = document.getElementById("goal-list");
    if (!box) return;
    box.innerHTML = "";
    if (!goals.length) { box.innerHTML = '<div class="tt-empty"><b>No goals yet</b><span>Set one below. Small goals add up.</span></div>'; return; }
    goals.forEach(function (g) {
      var row = document.createElement("label");
      row.className = "goal-row" + (g.done ? " done" : "");
      row.innerHTML = '<input type="checkbox" ' + (g.done ? "checked" : "") + ' data-goal="' + g.id + '" />'
        + '<span class="goal-text">' + esc(g.text) + "</span>"
        + (g.due ? '<span class="goal-due">by ' + esc(g.due) + "</span>" : "");
      box.appendChild(row);
    });
    save("edurise-goals", goals);
  }
  document.addEventListener("change", function (ev) {
    var c = ev.target.closest("[data-goal]");
    if (!c) return;
    var g = goals.filter(function (x) { return String(x.id) === c.getAttribute("data-goal"); })[0];
    if (g) { g.done = c.checked; renderGoals(); }
  });
  document.getElementById("goal-add") && document.getElementById("goal-add").addEventListener("click", function () {
    var t = document.getElementById("goal-text").value.trim(), d = document.getElementById("goal-due").value;
    if (!t) return alert("Write what you want to achieve.");
    goals.push({ id: Date.now(), text: t, due: d, done: false });
    document.getElementById("goal-text").value = ""; document.getElementById("goal-due").value = "";
    renderGoals();
  });

  /* ---------- Streak ---------- */
  var days = load("edurise-study-days", {});
  function streak() {
    var n = 0, d = new Date();
    function key(x) { return x.toISOString().slice(0, 10); }
    while (days[key(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function renderStreak() {
    var el = document.getElementById("streak-count"), box = document.getElementById("streak-dots");
    if (!el) return;
    el.textContent = streak();
    var btn = document.getElementById("streak-btn");
    if (days[today()]) { btn.disabled = true; btn.textContent = "Studied today"; }
    var html = "", d = new Date();
    for (var i = 6; i >= 0; i--) {
      var x = new Date(); x.setDate(d.getDate() - i);
      html += '<span title="' + x.toISOString().slice(0,10) + '" style="display:inline-block;width:12px;height:12px;border-radius:50%;margin:0 3px;background:' + (days[x.toISOString().slice(0,10)] ? "#F2762E" : "var(--border)") + '"></span>';
    }
    box.innerHTML = html;
    save("edurise-study-days", days);
  }
  document.getElementById("streak-btn") && document.getElementById("streak-btn").addEventListener("click", function () {
    days[today()] = true;
    renderStreak();
  });

  /* ---------- Today's classes + next-class reminders ---------- */
  var fired = {};
  function mins(t) { var p = t.split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
  function nowMins() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function dayKey() { var d = new Date(); return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()]; }
  function todaysClasses() {
    return tt.filter(function (e) { return e.day === dayKey(); })
      .sort(function (a, b) { return mins(a.start) - mins(b.start); });
  }
  function fmtCountdown(ms) {
    var m = Math.max(0, Math.round(ms / 60000));
    var h = Math.floor(m / 60);
    return h > 0 ? h + "h " + (m % 60 < 10 ? "0" : "") + (m % 60) + "m" : m + " min";
  }

  function esc2(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function drawTodayView() {
    var box = document.getElementById("today-view");
    if (!box) return;
    var nowEl = document.getElementById("tv-now");
    var listEl = document.getElementById("tv-list");
    var dateEl = document.getElementById("tv-date");
    var barEl = document.getElementById("tv-barfill");
    var progEl = document.getElementById("tv-progress");
    var d = new Date();
    var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (dateEl) dateEl.textContent = dayNames[d.getDay()] + " · " + d.toLocaleDateString();
    var list = todaysClasses();
    if (!list.length) {
      nowEl.innerHTML = "";
      barEl.style.width = "0%";
      progEl.textContent = "";
      listEl.innerHTML = "<p class='muted' style='margin:10px 0 0'>No classes in your timetable for today. Add periods in your timetable below to see them here with live reminders.</p>";
      return;
    }
    var n = nowMins(), cur = null, next = null, doneCount = 0;
    list.forEach(function (e) {
      if (mins(e.start) <= n && n < mins(e.end)) cur = e;
      else if (mins(e.start) > n && !next) next = e;
      if (mins(e.end) <= n) doneCount++;
    });
    var html = "";
    if (cur) {
      html = "<div style='margin:12px 0 2px;font-size:17px'><span class='tv-pill' style='background:#F2762E;color:#fff;margin-right:8px'>Now</span><b>" + esc2(cur.subject) + "</b> <span class='muted' style='font-size:13.5px'>· ends in <b>" + fmtCountdown((mins(cur.end) - n) * 60000) + "</b></span></div>";
    } else if (next) {
      html = "<div style='margin:12px 0 2px;font-size:17px'><span class='tv-pill' style='background:rgba(242,118,46,.15);color:#F2762E;margin-right:8px'>Next</span><b>" + esc2(next.subject) + "</b> <span class='muted' style='font-size:13.5px'>· starts " + next.start + " (in <b>" + fmtCountdown((mins(next.start) - n) * 60000) + "</b>)</span></div>";
    } else {
      html = "<div style='margin:12px 0 2px;font-size:17px'>All classes done for today <svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><circle cx='12' cy='8' r='7'/><polyline points='8.21 13.89 7 23 12 20 17 23 15.79 13.88'/></svg> <span class='muted' style='font-size:13.5px'>Great work — use the focus timer below.</span></div>";
    }
    nowEl.innerHTML = html;
    barEl.style.width = Math.round(doneCount / list.length * 100) + "%";
    progEl.textContent = doneCount + " of " + list.length + " classes finished today";
    var rows = "";
    list.forEach(function (e) {
      var cls = "tv-row", pill = "Upcoming";
      if (mins(e.end) <= n) { cls += " done"; pill = "Done"; }
      else if (mins(e.start) <= n && n < mins(e.end)) { cls += " now"; pill = "Now"; }
      rows += "<div class='" + cls + "'><span class='tv-time'>" + e.start + "–" + e.end + "</span><span class='tv-sub'>" + esc2(e.subject) + "</span><span class='tv-pill'>" + pill + "</span></div>";
    });
    listEl.innerHTML = rows;
  }

  function drawToday() {
    if (typeof drawTodayView === "function") drawTodayView();
    var line = document.getElementById("today-line");
    if (!line) return;
    var list = todaysClasses();
    if (!list.length) {
      line.innerHTML = "No classes in your timetable for " + dayKey() + ". Add periods below to get reminders.";
      return;
    }
    var n = nowMins(), cur = null, next = null;
    list.forEach(function (e) {
      if (mins(e.start) <= n && n < mins(e.end)) cur = e;
      else if (mins(e.start) > n && !next) next = e;
    });
    var html = "";
    if (cur) html += "Now: <b>" + cur.subject + "</b> (until " + cur.end + ")";
    else if (next) html += "Next: <b>" + next.subject + "</b> at " + next.start;
    else html += "Classes done for today <svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><circle cx='12' cy='8' r='7'/><polyline points='8.21 13.89 7 23 12 20 17 23 15.79 13.88'/></svg>";
    if (next && cur) html += " · then <b>" + next.subject + "</b> at " + next.start;
    var total = list.length;
    line.innerHTML = "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><rect x='3' y='4' width='18' height='18' rx='2' ry='2'/><line x1='16' y1='2' x2='16' y2='6'/><line x1='8' y1='2' x2='8' y2='6'/><line x1='3' y1='10' x2='21' y2='10'/></svg> " + dayKey() + ": " + total + (total === 1 ? " class today. " : " classes today. ") + html;
  }
  function checkClassStart() {
    if (pref("edurise-notif", "on") === "off") return;
    var n = nowMins(), key = today() + "|" + nowMins();
    todaysClasses().forEach(function (e) {
      var stamp = today() + "|" + e.day + "|" + e.start;
      if (n === mins(e.start) && !fired[stamp]) {
        fired[stamp] = true;
        try {
          if ("Notification" in window && Notification.permission === "granted")
            new Notification("Class time: " + e.subject, { body: "Starts now (" + e.start + "). Ends " + e.end + "." });
        } catch (err) {}
        try { navigator.vibrate && navigator.vibrate([150, 80, 150]); } catch (err) {}
      }
    });
  }
  setInterval(function () { drawToday(); checkClassStart(); }, 30000);

  /* ---------- Timer (uses Account settings preferences) ---------- */
  function pref(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function prefNum(k, d) { var n = parseInt(pref(k, ""), 10); return isNaN(n) ? d : n; }
  var WORK = prefNum("edurise-timer-work", 25) * 60;
  var BREAK = prefNum("edurise-timer-break", 5) * 60;
  var mode = "work", left = WORK, running = null;

  function alarm() {
    var m = pref("edurise-alarm-mode", "sound");
    if (m === "silent") return;
    if (m === "vibrate" || !window.AudioContext && !window.webkitAudioContext) {
      try { navigator.vibrate && navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) {}
      if (m === "vibrate") return;
    }
    try {
      var ctx = alarm.ctx || (alarm.ctx = new (window.AudioContext || window.webkitAudioContext)());
      if (ctx.state === "suspended") ctx.resume();
      var t = ctx.currentTime + 0.05;
      function b(f, start, dur, type) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.001, t + start);
        g.gain.exponentialRampToValueAtTime(0.5, t + start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + start); o.stop(t + start + dur + 0.05);
      }
      var tone = pref("edurise-alarm-tone", "beep");
      if (tone === "chime") { b(660, 0, 0.5); b(880, 0.25, 0.7); }
      else if (tone === "bell") { b(523, 0, 0.6, "triangle"); b(659, 0.5, 0.8, "triangle"); }
      else { b(880, 0, 0.18, "square"); b(880, 0.28, 0.18, "square"); b(880, 0.56, 0.18, "square"); }
      try { navigator.vibrate && navigator.vibrate(150); } catch (e) {}
    } catch (e) {}
  }
  document.addEventListener("click", function unlock() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { alarm.ctx = alarm.ctx || new AC(); if (alarm.ctx.state === "suspended") alarm.ctx.resume(); }
    } catch (e) {}
    document.removeEventListener("click", unlock);
  }, { once: true });
  function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return (m < 10 ? "0" : "") + m + ":" + (x < 10 ? "0" : "") + x; }
  function draw() {
    var el = document.getElementById("timer-display");
    if (!el) return;
    el.textContent = (mode === "work" ? "Study: " : "Break: ") + fmt(left);
    document.title = (running ? "● " : "") + fmt(left) + (mode === "work" ? " — study" : " — break");
  }
  function tick() {
    left--;
    if (left <= 0) {
      stop();
      if (mode === "work") {
        var s = load("edurise-sessions", {});
        s[today()] = (s[today()] || 0) + 1;
        save("edurise-sessions", s);
        var c = document.getElementById("session-count");
        if (c) c.textContent = s[today()] + " today";
        mode = "break"; left = BREAK;
      } else { mode = "work"; left = WORK; }
      if (pref("edurise-notif", "on") !== "off") {
        alarm();
        try { if (Notification && Notification.permission === "granted") new Notification(mode === "work" ? "Break over — back to study!" : "Great job! Take a " + (BREAK / 60) + "-minute break."); } catch (e) {}
      }
    }
    draw();
  }
  function start() { if (!running) { running = setInterval(tick, 1000); draw(); } }
  function stop() { clearInterval(running); running = null; draw(); }
  document.getElementById("timer-start") && document.getElementById("timer-start").addEventListener("click", function () {
    if (!("Notification" in window)) {} else if (Notification.permission === "default" && pref("edurise-notif", "on") !== "off") Notification.requestPermission();
    running ? stop() : start();
    this.textContent = running ? "Pause" : "Start";
  });
  document.getElementById("timer-reset") && document.getElementById("timer-reset").addEventListener("click", function () {
    stop(); mode = "work"; left = WORK; draw();
    document.getElementById("timer-start").textContent = "Start";
  });
  window.addEventListener("DOMContentLoaded", function () {
    renderTT(); renderGoals(); renderStreak(); draw(); drawToday(); checkClassStart();
    var s = load("edurise-sessions", {});
    var c = document.getElementById("session-count");
    if (c) c.textContent = (s[today()] || 0) + " today";
    var lbl = document.getElementById("timer-label");
    if (lbl) lbl.textContent = "(" + (WORK / 60) + " min study / " + (BREAK / 60) + " min break)";
  });
})();
