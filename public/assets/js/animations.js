/* EduRise motion layer — ripples, count-ups, confetti, bar fills.
   Theme-aware (colors read from CSS variables) and fully disabled when the
   user's Accessibility "reduce motion" setting is on (CSS handles that). */
(function () {
  var doc = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    doc.getAttribute("data-motion") === "reduce";
  if (reduced) return;

  function accentColors() {
    var cs = getComputedStyle(doc);
    var a = cs.getPropertyValue("--accent").trim() || "#F2762E";
    var b = cs.getPropertyValue("--brand").trim() || "#1B2A52";
    return [a, b, "#2e9e5b", "#FFD9A8", "#ffffff"];
  }

  /* 1. Ripple on every button-style element */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".btn, .menu-cta");
    if (!b) return;
    var rect = b.getBoundingClientRect();
    var d = 20;
    var r = document.createElement("span");
    r.className = "edurise-ripple";
    r.style.width = r.style.height = d + "px";
    r.style.left = (e.clientX - rect.left - d / 2) + "px";
    r.style.top = (e.clientY - rect.top - d / 2) + "px";
    b.appendChild(r);
    setTimeout(function () { r.remove(); }, 650);
  }, true);

  /* 2. Count-up: window.eduriseCount(el, target) */
  window.eduriseCount = function (el, target, ms) {
    if (!el) return;
    el.classList.remove("edurise-pop"); void el.offsetWidth; el.classList.add("edurise-pop");
    ms = ms || 900;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / ms, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  /* 3. Confetti: window.eduriseCelebrate() */
  window.eduriseCelebrate = function (count) {
    var colors = accentColors();
    count = count || 42;
    for (var i = 0; i < count; i++) {
      var c = document.createElement("div");
      c.className = "edurise-confetti";
      c.style.left = (2 + Math.random() * 96) + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (1.6 + Math.random() * 1.5) + "s";
      c.style.animationDelay = (Math.random() * 0.4) + "s";
      document.body.appendChild(c);
      (function (cc) { setTimeout(function () { cc.remove(); }, 3600); })(c);
    }
  };

  /* 4. Bar fills: window.eduriseFill(el, percent) — animates a .bar-fill */
  window.eduriseFill = function (el, percent) {
    if (!el) return;
    el.style.width = "0%";
    void el.offsetWidth;
    el.style.width = Math.max(0, Math.min(100, percent)) + "%";
  };

  /* 5. Auto-fill bars already marked .bar-fill with data-w on load */
  function autoFill() {
    document.querySelectorAll(".bar-fill[data-w]").forEach(function (el) {
      setTimeout(function () { window.eduriseFill(el, parseFloat(el.dataset.w)); }, 80);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoFill);
  } else { autoFill(); }

  /* 6. Staggered entrance: cards/rows rise in one after another */
  function entrance() {
    var sel = "main section.card, .t-row, .feature-card, .school-card, .track-card, .vs-card, .lb-row, .q-opt";
    var els = Array.prototype.slice.call(document.querySelectorAll(sel));
    if (!els.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        el.classList.add("edurise-in");
        el.style.animationDelay = Math.min(i * 65, 460) + "ms";
        el.classList.add("edurise-shown");
        i++;
      });
    }, { threshold: 0.06 });
    els.forEach(function (el) { io.observe(el); });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", entrance);
  } else { entrance(); }
})();
