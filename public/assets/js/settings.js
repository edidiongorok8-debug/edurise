/* EduRise account settings — theme, anime skins & accents (per device) */
(function () {
  var ACCENTS = [
    { id: "orange", name: "Sunset Orange", main: "#F2762E" },
    { id: "teal", name: "Ocean Teal", main: "#0FA3A3" },
    { id: "violet", name: "Royal Violet", main: "#8B5CF6" },
    { id: "rose", name: "Dusty Rose", main: "#F43F5E" },
    { id: "emerald", name: "Emerald", main: "#10B981" },
    { id: "sky", name: "Sky Blue", main: "#0EA5E9" },
    { id: "amber", name: "Amber Gold", main: "#F59E0B" }
  ];
  var SKINS = [
    { id: "", name: "Default", bg: "#0b1020", accent: "#F2762E" },
    { id: "sakura", name: "Sakura Night", bg: "#1d1128", accent: "#ff6fa5" },
    { id: "neon", name: "Neon Tokyo", bg: "#0a0d1f", accent: "#22d3ee" },
    { id: "kitsune", name: "Kitsune Gold", bg: "#140f21", accent: "#f59e0b" },
    { id: "deepblue", name: "Deep Blue", bg: "#071726", accent: "#38bdf8" },
    { id: "matcha", name: "Matcha Green", bg: "#0f1a12", accent: "#a3e635" },
    { id: "crimson", name: "Crimson Flame", bg: "#1a0e12", accent: "#ef4444" }
  ];
  var html = document.documentElement;

  function curTheme() { return html.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function curSkin() {
    try { return localStorage.getItem("edurise-skin") || ""; } catch (e) { return ""; }
  }
  function curAccent() {
    try { return localStorage.getItem("edurise-accent") || "orange"; } catch (e) { return "orange"; }
  }
  function clear(key, attr) {
    try { localStorage.removeItem(key); } catch (e) {}
    html.removeAttribute(attr);
  }

  function paint() {
    var skinOn = curSkin() !== "";
    document.querySelectorAll(".theme-option").forEach(function (o) {
      var on = o.getAttribute("data-value") === curTheme();
      o.classList.toggle("active", on);
      o.querySelector(".tick").innerHTML = on ? "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><polyline points='20 6 9 17 4 12'/></svg> active" : "";
    });
    document.querySelectorAll(".swatch").forEach(function (s) {
      s.classList.toggle("active", !skinOn && s.getAttribute("data-accent") === curAccent());
    });
    document.querySelectorAll(".skin-card").forEach(function (c) {
      var on = c.getAttribute("data-skin") === curSkin();
      c.classList.toggle("active", on);
      c.querySelector(".tick").innerHTML = on ? "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><polyline points='20 6 9 17 4 12'/></svg> active" : "";
    });
  }

  /* theme */
  document.querySelectorAll(".theme-option").forEach(function (o) {
    function pick() {
      html.setAttribute("data-theme", o.getAttribute("data-value"));
      try { localStorage.setItem("edurise-theme", o.getAttribute("data-value")); } catch (e) {}
      paint();
    }
    o.addEventListener("click", pick);
    o.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
  });

  /* accents */
  var row = document.getElementById("accent-row");
  ACCENTS.forEach(function (a) {
    var wrap = document.createElement("div");
    wrap.className = "swatch-cell";
    var s = document.createElement("div");
    s.className = "swatch"; s.setAttribute("data-accent", a.id);
    s.setAttribute("role", "button"); s.tabIndex = 0; s.title = a.name;
    s.style.background = "linear-gradient(135deg, " + a.main + " 50%, #1B2A52 50%)";
    s.addEventListener("click", function () {
      clear("edurise-skin", "data-skin");
      html.setAttribute("data-accent", a.id);
      try { localStorage.setItem("edurise-accent", a.id); } catch (e) {}
      paint();
    });
    var n = document.createElement("div");
    n.className = "swatch-name"; n.textContent = a.name;
    wrap.appendChild(s); wrap.appendChild(n);
    row.appendChild(wrap);
  });

  /* anime skins */
  var grid = document.getElementById("skin-grid");
  SKINS.forEach(function (k) {
    var c = document.createElement("div");
    c.className = "skin-card"; c.setAttribute("data-skin", k.id);
    c.setAttribute("role", "button"); c.tabIndex = 0;
    c.innerHTML = '<div class="preview" style="background:' + k.bg + '">'
      + '<div class="bar" style="background:linear-gradient(90deg,' + k.bg + ',' + k.accent + ')"></div>'
      + '<div class="lines"><i style="width:80%"></i><i style="width:55%"></i></div></div>'
      + k.name + '<span class="tick"></span>';
    function pick() {
      if (k.id === "") { clear("edurise-skin", "data-skin"); }
      else {
        clear("edurise-accent", "data-accent");
        html.setAttribute("data-theme", "dark");
        try { localStorage.setItem("edurise-theme", "dark"); } catch (e) {}
        html.setAttribute("data-skin", k.id);
        try { localStorage.setItem("edurise-skin", k.id); } catch (e) {}
      }
      paint();
    }
    c.addEventListener("click", pick);
    c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    grid.appendChild(c);
  });

  /* ---------- prefs helpers ---------- */
  function pref(k, d) {
    try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; }
  }
  function setPref(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var APPEARANCE = ["edurise-theme", "edurise-accent", "edurise-skin", "edurise-textsize", "edurise-motion", "edurise-home"];

  function bindSelect(id, key, d) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = pref(key, d);
    el.addEventListener("change", function () { setPref(key, el.value); });
  }
  function bindPills(rowId, key, d, attr) {
    var row = document.getElementById(rowId);
    if (!row) return;
    var btns = row.querySelectorAll(".pill-btn");
    function mark() {
      btns.forEach(function (b) { b.classList.toggle("active", b.getAttribute(attr) === pref(key, d)); });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { setPref(key, b.getAttribute(attr)); mark(); });
    });
    mark();
  }
  function bindToggle(id, key, onVal, offVal, initial) {
    var el = document.getElementById(id);
    if (!el) return;
    el.checked = pref(key, initial ? onVal : offVal) === (initial ? onVal : offVal) && pref(key, initial ? onVal : offVal) === onVal;
    el.checked = pref(key, initial ? onVal : offVal) === onVal;
    el.addEventListener("change", function () {
      setPref(key, el.checked ? onVal : offVal);
      if (el.checked && key === "edurise-notif" && "Notification" in window && Notification.permission === "default") {
        try { Notification.requestPermission(); } catch (e) {}
      }
    });
  }

  /* notifications */
  bindToggle("notif-toggle", "edurise-notif", "on", "off", true);
  bindSelect("alarm-mode", "edurise-alarm-mode", "sound");
  /* study preferences */
  bindPills("timer-len-row", "edurise-timer-work", "25", "data-min");
  bindPills("break-len-row", "edurise-timer-break", "5", "data-min");
  bindSelect("alarm-tone", "edurise-alarm-tone", "beep");
  /* play the chosen tone straight away so the user can hear it */
  var toneCtx = null;
  function playTone(tone) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { try { navigator.vibrate && navigator.vibrate(200); } catch (e) {} return false; }
    try {
      toneCtx = toneCtx || new AC();
      if (toneCtx.state === "suspended") toneCtx.resume();
      var t = toneCtx.currentTime + 0.05;
      function b(f, start, dur, type) {
        var o = toneCtx.createOscillator(), g = toneCtx.createGain();
        o.type = type || "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.001, t + start);
        g.gain.exponentialRampToValueAtTime(0.5, t + start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
        o.connect(g); g.connect(toneCtx.destination);
        o.start(t + start); o.stop(t + start + dur + 0.05);
      }
      if (tone === "chime") { b(660, 0, 0.5); b(880, 0.25, 0.7); }
      else if (tone === "bell") { b(523, 0, 0.6, "triangle"); b(659, 0.5, 0.8, "triangle"); }
      else { b(880, 0, 0.18, "square"); b(880, 0.28, 0.18, "square"); b(880, 0.56, 0.18, "square"); }
      return true;
    } catch (e) { return false; }
  }
  var toneSel = document.getElementById("alarm-tone");
  if (toneSel) {
    toneSel.addEventListener("change", function () { playTone(toneSel.value); });
    var tb = document.createElement("button");
    tb.type = "button"; tb.className = "btn"; tb.id = "tone-test";
    tb.style.marginTop = "10px";
    tb.textContent = "Play this sound";
    tb.addEventListener("click", function () {
      var ok = playTone(toneSel.value);
      var m = pref("edurise-alarm-mode", "sound");
      tb.textContent = ok ? (m === "sound" ? "Playing…" : "Playing (alarm mode is " + m + ")") : "Sound not supported here";
      setTimeout(function () { tb.textContent = "Play this sound"; }, 1800);
    });
    toneSel.parentNode.appendChild(tb);
  }
  /* accessibility */
  bindPills("textsize-row", "edurise-textsize", "M", "data-size");
  document.getElementById("textsize-row").addEventListener("click", function () {
    var z = pref("edurise-textsize", "M");
    if (z === "M") html.removeAttribute("data-textsize");
    else html.setAttribute("data-textsize", z);
  });
  bindToggle("motion-toggle", "edurise-motion", "reduce", "full", false);
  var mt = document.getElementById("motion-toggle");
  mt.checked = pref("edurise-motion", "full") === "reduce";
  mt.addEventListener("change", function () {
    if (mt.checked) html.setAttribute("data-motion", "reduce");
    else html.removeAttribute("data-motion");
  });
  /* splash */
  bindToggle("splash-toggle", "edurise-splash", "on", "off", true);
  var st = document.getElementById("splash-toggle");
  st.checked = pref("edurise-splash", "on") !== "off";
  /* default page */
  bindSelect("home-select", "edurise-home", "home");

  /* install app */
  var ib = document.getElementById("install-btn");
  var hint = document.getElementById("install-hint");
  var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  function setHint(t) { hint.textContent = t; }
  if (standalone || window.__eduriseInstalled) {
    ib.textContent = "Installed ✓"; ib.disabled = true;
    setHint("EduRise is already installed on this device.");
  } else if (window.__eduriseInstallPrompt) {
    setHint("Tap the button and confirm to install.");
  } else if (isIOS) {
    setHint("On iPhone: tap the Share button in Safari, then 'Add to Home Screen'.");
  } else {
    setHint("Getting ready… if the button does not open an install box, use the browser menu (⋮) then 'Install app'.");
  }
  window.addEventListener("edurise-install-ready", function () { if (!standalone) setHint("Ready. Tap the button and confirm to install."); });
  window.addEventListener("edurise-installed", function () { ib.textContent = "Installed ✓"; ib.disabled = true; setHint("EduRise is installed. Open it from your home screen."); });
  ib.addEventListener("click", function () {
    var p = window.__eduriseInstallPrompt;
    if (p) {
      p.prompt();
      p.userChoice.then(function (r) {
        window.__eduriseInstallPrompt = null;
        setHint(r.outcome === "accepted" ? "Installing… check your home screen / app list in a moment." : "No problem. You can install any time from here.");
      });
    } else if (isIOS) {
      setHint("On iPhone: tap the Share button in Safari, then 'Add to Home Screen'.");
    } else {
      setHint("Your browser has not offered the install box yet. Open the browser menu (⋮) and choose 'Install app' or 'Add to Home screen'. If you just opened the site, wait a few seconds and tap again.");
    }
  });

  /* data & privacy */
  document.getElementById("export-btn").addEventListener("click", function () {
    var out = { exported: new Date().toISOString(), app: "EduRise", data: {} };
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("edurise-") === 0) out.data[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "edurise-my-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  document.getElementById("clear-btn").addEventListener("click", function () {
    if (!confirm("Clear all your saved study data, goals, streaks and AI chats on this device? This cannot be undone.")) return;
    try {
      var kill = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("edurise-") === 0 && APPEARANCE.indexOf(k) === -1) kill.push(k);
      }
      kill.forEach(function (k) { localStorage.removeItem(k); });
      try { sessionStorage.removeItem("edurise-verse-seen"); } catch (e) {}
      alert("Done — your study data on this device has been cleared.");
    } catch (e) { alert("Could not clear data on this browser."); }
  });

  /* your account (staff session) */
  var box = document.getElementById("acct-box");
  fetch("/api/v1/auth/me", { credentials: "include" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (me) {
      if (!me) {
        box.innerHTML = '<div class="acct-row"><span class="k">Status</span><span class="v">Browsing as student</span></div>'
          + '<p class="muted" style="margin:10px 0 0;font-size:13px">Students don\'t need an account — tools save privately on the device. Staff can <a href="/sign-in">sign in</a> to manage their school.</p>';
        return;
      }
      var role = (me.role || "").replace("_", " ");
      box.innerHTML = '<div class="acct-row"><span class="k">Email</span><span class="v">' + (me.email || "") + '</span></div>'
        + (me.display_name ? '<div class="acct-row"><span class="k">Name</span><span class="v">' + me.display_name + '</span></div>' : '')
        + '<div class="acct-row"><span class="k">Role</span><span class="v">' + role + '</span></div>'
        + '<div class="btn-row"><button id="acct-signout" class="btn" type="button"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Sign out</button></div>';
      document.getElementById("acct-signout").addEventListener("click", function () {
        fetch("/api/v1/auth/signout", { method: "POST", credentials: "include" })
          .then(function () { location.href = "/sign-in"; });
      });
    })
    .catch(function () {
      box.innerHTML = '<p class="muted" style="margin:0">Browsing as student. Staff can <a href="/sign-in">sign in</a>.</p>';
    });

  paint();
})();
