(function () {
  try { if (localStorage.getItem("edurise-cookie-choice")) return; } catch (e) {}
  var bar = document.createElement("div");
  bar.setAttribute("role", "dialog");
  bar.setAttribute("aria-label", "Cookie notice");
  bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#1B2A52;color:#fff;padding:14px 18px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;font-size:13px;box-shadow:0 -2px 12px rgba(0,0,0,.3)";
  bar.innerHTML = '<span>We use one essential cookie to keep you signed in and remember your theme. No advertising cookies. <a href="/privacy" style="color:#F2762E">Privacy policy</a></span><span><button id="ck-ok" style="background:#F2762E;color:#fff;border:0;border-radius:8px;padding:8px 16px;font-weight:600;cursor:pointer">Got it</button></span>';
  document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(bar);
    document.getElementById("ck-ok").onclick = function () {
      try { localStorage.setItem("edurise-cookie-choice", "ok"); } catch (e) {}
      bar.remove();
    };
  });
})();
