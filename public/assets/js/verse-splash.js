/* EduRise — 5-second Bible verse splash, once per visit */
(function () {
  try { if (localStorage.getItem("edurise-splash") === "off") return; } catch (e) {}
  var seen;
  try { seen = sessionStorage.getItem("edurise-verse-seen"); } catch (e) {}
  if (seen) return;
  try { sessionStorage.setItem("edurise-verse-seen", "1"); } catch (e) {}
  var v = window.EDURISE_VERSE_OF_DAY ? window.EDURISE_VERSE_OF_DAY() : null;
  if (!v) return;
  var o = document.createElement("div");
  o.setAttribute("role", "status");
  o.style.cssText = "position:fixed;inset:0;z-index:9998;background:#0e1430;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;transition:opacity .6s";
  o.innerHTML = '<div style="margin-bottom:18px;color:#F2762E"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>'
    + '<p style="max-width:520px;margin:0 auto;font-size:20px;line-height:1.5;color:#fff">"' + v.text + '"</p>'
    + '<p style="margin:16px 0 0;color:#F2762E;font-weight:700">' + v.ref + ' (KJV)</p>'
    + '<button id="verse-skip" style="position:fixed;bottom:28px;right:24px;background:transparent;color:#9ca3af;border:1px solid #2a3350;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer">Skip</button>';
  document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(o);
    var gone = false;
    function hide() {
      if (gone) return; gone = true;
      o.style.opacity = "0";
      setTimeout(function () { o.remove(); }, 650);
    }
    document.getElementById("verse-skip").onclick = hide;
    setTimeout(hide, 5000);
  });
})();
