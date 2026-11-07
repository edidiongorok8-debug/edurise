/* EduRise theme toggle — remembers visitor choice */
(function () {
  var saved = null;
  try { saved = localStorage.getItem("edurise-theme"); } catch (e) {}
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  var theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);

  window.EduRiseToggleTheme = function () {
    var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", cur);
    try { localStorage.setItem("edurise-theme", cur); } catch (e) {}
    var b = document.getElementById("theme-btn");
    if (b) b.innerHTML = cur === "dark" ? "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><circle cx='12' cy='12' r='5'/><line x1='12' y1='1' x2='12' y2='3'/><line x1='12' y1='21' x2='12' y2='23'/><line x1='4.22' y1='4.22' x2='5.64' y2='5.64'/><line x1='18.36' y1='18.36' x2='19.78' y2='19.78'/><line x1='1' y1='12' x2='3' y2='12'/><line x1='21' y1='12' x2='23' y2='12'/><line x1='4.22' y1='19.78' x2='5.64' y2='18.36'/><line x1='18.36' y1='5.64' x2='19.78' y2='4.22'/></svg> Light" : "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'/></svg> Dark";
  };

  window.addEventListener("DOMContentLoaded", function () {
    var b = document.getElementById("theme-btn");
    if (b) {
      b.addEventListener("click", window.EduRiseToggleTheme);
      b.innerHTML = theme === "dark" ? "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><circle cx='12' cy='12' r='5'/><line x1='12' y1='1' x2='12' y2='3'/><line x1='12' y1='21' x2='12' y2='23'/><line x1='4.22' y1='4.22' x2='5.64' y2='5.64'/><line x1='18.36' y1='18.36' x2='19.78' y2='19.78'/><line x1='1' y1='12' x2='3' y2='12'/><line x1='21' y1='12' x2='23' y2='12'/><line x1='4.22' y1='19.78' x2='5.64' y2='18.36'/><line x1='18.36' y1='5.64' x2='19.78' y2='4.22'/></svg> Light" : "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'/></svg> Dark";
    }
  });

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    window.__eduriseInstallPrompt = e;
    try { window.dispatchEvent(new Event("edurise-install-ready")); } catch (x) {}
    showInstallBanner();
  });
  window.addEventListener("appinstalled", function () {
    window.__eduriseInstalled = true;
    var bn = document.getElementById("edurise-install-banner"); if (bn) bn.remove();
    try { window.dispatchEvent(new Event("edurise-installed")); } catch (x) {}
  });
  function showInstallBanner() {
    try { if (localStorage.getItem("edurise-banner") === "off") return; } catch (e) { return; }
    if (document.getElementById("edurise-install-banner")) return;
    var b = document.createElement("div");
    b.id = "edurise-install-banner";
    b.setAttribute("role", "dialog");
    b.style.cssText = "position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:9950;"
      + "display:flex;align-items:center;gap:12px;max-width:92vw;padding:12px 16px;"
      + "background:var(--card,var(--bg2));border:1px solid var(--border);border-radius:14px;"
      + "box-shadow:0 10px 30px rgba(0,0,0,.35);font-size:13.5px;color:var(--ink)";
    var t = document.createElement("span");
    t.innerHTML = "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><rect x='5' y='2' width='14' height='20' rx='2'/><line x1='12' y1='18' x2='12.01' y2='18'/></svg> <b>Install EduRise</b> — opens like an app, works offline";
    var yes = document.createElement("button");
    yes.textContent = "Install";
    yes.style.cssText = "flex:none;padding:8px 14px;border:none;border-radius:999px;background:var(--accent,#F2762E);color:#fff;font:inherit;font-weight:700;cursor:pointer";
    var no = document.createElement("button");
    no.textContent = "×";
    no.setAttribute("aria-label", "Dismiss");
    no.style.cssText = "flex:none;padding:6px 10px;border:none;border-radius:999px;background:transparent;color:var(--muted,#888);font-size:17px;cursor:pointer";
    b.appendChild(t); b.appendChild(yes); b.appendChild(no);
    yes.addEventListener("click", function () {
      var p = window.__eduriseInstallPrompt;
      if (p) { p.prompt(); p.userChoice.then(function () { b.remove(); }); }
    });
    function dismiss() {
      try { localStorage.setItem("edurise-banner", "off"); } catch (e) {}
      b.remove();
    }
    no.addEventListener("click", dismiss);
    document.body.appendChild(b);
  }
  window.addEventListener("DOMContentLoaded", function () {
    var path = location.pathname.replace(/\.html$/, "");
    document.querySelectorAll(".menu-panel .menu-item").forEach(function (a) {
      var nav = a.getAttribute("data-nav");
      if ((nav === "/" && path === "/") || (nav !== "/" && path.indexOf(nav) === 0)) a.classList.add("active");
    });
  });

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }
})();
