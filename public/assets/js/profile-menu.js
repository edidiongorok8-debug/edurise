/* EduRise — profile chip in the header with appearance controls.
   Pattern borrowed from GitHub, Google and Notion account menus: a small round
   avatar, a card that opens under it, grouped links, and an appearance row that
   changes theme + accent colour without leaving the page. Choice is remembered. */
(function () {
  var html = document.documentElement;

  var ACCENTS = [
    { key: "orange", name: "Orange", color: "#F2762E" },
    { key: "royal", name: "Royal", color: "#4C6EF5" },
    { key: "emerald", name: "Emerald", color: "#0E9F6E" },
    { key: "violet", name: "Violet", color: "#7C3AED" },
    { key: "rose", name: "Rose", color: "#E11D48" },
    { key: "teal", name: "Teal", color: "#0D9488" }
  ];

  try { html.setAttribute("data-accent", localStorage.getItem("edurise-accent") || "orange"); } catch (e) {}

  function currentAccent() {
    if (html.getAttribute("data-accent")) return html.getAttribute("data-accent");
    try { return localStorage.getItem("edurise-accent") || "orange"; } catch (e) { return "orange"; }
  }
  function setAccent(key) {
    html.setAttribute("data-accent", key);
    try { localStorage.setItem("edurise-accent", key); } catch (e) {}
  }
  function currentTheme() { return html.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function setTheme(t) {
    html.setAttribute("data-theme", t);
    try { localStorage.setItem("edurise-theme", t); } catch (e) {}
    paint();
  }

  var header = document.querySelector("header.site");
  if (!header) return;

  // ---------- build the chip ----------
  var chip = document.createElement("button");
  chip.type = "button";
  chip.className = "profile-chip";
  chip.setAttribute("aria-label", "Your profile and appearance");
  chip.setAttribute("aria-expanded", "false");
  chip.innerHTML = '<span class="pf-avatar" aria-hidden="true">E</span>'
    + '<svg class="ic pf-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

  var panel = document.createElement("div");
  panel.className = "profile-panel";
  panel.setAttribute("role", "menu");
  panel.hidden = true;
  panel.innerHTML = ''
    + '<div class="pf-head">'
    + '  <span class="pf-avatar big" aria-hidden="true">E</span>'
    + '  <div class="pf-id"><b id="pf-name">Guest</b><small id="pf-role">Student · not signed in</small></div>'
    + '</div>'
    + '<p class="pf-label">Appearance</p>'
    + '<div class="pf-row">'
    + '  <div class="pf-seg" role="group" aria-label="Theme">'
    + '    <button type="button" data-theme-set="light">Light</button>'
    + '    <button type="button" data-theme-set="dark">Dark</button>'
    + '  </div>'
    + '</div>'
    + '<div class="pf-swatches" id="pf-swatches" role="group" aria-label="Accent colour"></div>'
    + '<p class="pf-hint" id="pf-hint">Orange is the EduRise colour. Pick another if you like.</p>'
    + '<div class="pf-links">'
    + '  <a role="menuitem" href="/student">My study space</a>'
    + '  <a role="menuitem" href="/settings">Settings &amp; preferences</a>'
    + '  <a role="menuitem" href="/dashboard">Staff dashboard</a>'
    + '  <a role="menuitem" href="/sign-in">Sign in / switch account</a>'
    + '</div>';

  header.appendChild(chip);
  header.appendChild(panel);

  // ---------- paint state ----------
  var swEl = panel.querySelector("#pf-swatches");
  ACCENTS.forEach(function (a) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "pf-swatch";
    b.dataset.accent = a.key;
    b.style.setProperty("--sw", a.color);
    b.title = a.name;
    b.setAttribute("aria-label", a.name + " accent");
    b.addEventListener("click", function () { setAccent(a.key); paint(); });
    swEl.appendChild(b);
  });

  function paint() {
    var t = currentTheme(), acc = currentAccent();
    panel.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.classList.toggle("on", b.dataset.themeSet === t);
    });
    panel.querySelectorAll(".pf-swatch").forEach(function (b) {
      b.classList.toggle("on", b.dataset.accent === acc);
    });
  }

  // ---------- identity ----------
  function setIdentity(name, note) {
    var n = panel.querySelector("#pf-name"), r = panel.querySelector("#pf-role");
    if (n) n.textContent = name;
    if (r) r.textContent = note;
    var initial = (name || "E").trim().charAt(0).toUpperCase() || "E";
    panel.querySelectorAll(".pf-avatar").forEach(function (a) { a.textContent = initial; });
  }

  try {
    var saved = JSON.parse(localStorage.getItem("edurise-chat-id") || "null");
    if (saved && saved.role) setIdentity(saved.role === "teacher" ? "Staff member" : "Student",
      saved.role === "teacher" ? "Teacher · signed in with Google" : "Student · studying privately");
  } catch (e) {}

  if (window.EduRiseAPI && window.EduRiseAPI.me) {
    Promise.resolve(window.EduRiseAPI.me()).then(function (me) {
      if (me && (me.full_name || me.email)) {
        setIdentity(me.full_name || me.email, (me.school_name ? me.school_name + " · " : "") + "staff account");
      }
    }).catch(function () {});
  }

  // ---------- open / close ----------
  function open() {
    panel.hidden = false;
    chip.setAttribute("aria-expanded", "true");
    paint();
    document.addEventListener("click", onDoc, true);
    document.addEventListener("keydown", onKey);
  }
  function close() {
    panel.hidden = true;
    chip.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", onDoc, true);
    document.removeEventListener("keydown", onKey);
  }
  function onDoc(e) {
    if (panel.contains(e.target) || chip.contains(e.target)) return;
    close();
  }
  function onKey(e) { if (e.key === "Escape") { close(); chip.focus(); } }

  chip.addEventListener("click", function () { panel.hidden ? open() : close(); });
  panel.addEventListener("click", function (e) {
    var b = e.target.closest("[data-theme-set]");
    if (b) setTheme(b.dataset.themeSet);
  });

  paint();
})();
