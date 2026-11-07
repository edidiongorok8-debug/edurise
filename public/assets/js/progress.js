/* EduRise Progress Analysis — donut chart of your performance across the
   four main JAMB subjects, built from Past Questions + Practice Test answers.
   Privacy: reads only this device's localStorage; nothing is sent anywhere. */
(function () {
  var SUBJECTS = ["English", "Maths", "Chemistry", "Physics"];
  var FALLBACK_COLORS = ["#F2762E", "#2e9e5b", "#4a90d9", "#9b59b6"];
  var $ = function (id) { return document.getElementById(id); };
  if (!$("pa-donut")) return;

  var accent = "#F2762E";
  try {
    var v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    if (v) accent = v;
  } catch (e) {}
  var colors = [accent, "#2e9e5b", "#4a90d9", "#9b59b6"];
  if (v && FALLBACK_COLORS[0] === colors[0]) { /* accent kept theme-aware */ }

  var prog = {};
  try { prog = JSON.parse(localStorage.getItem("edurise-progress") || "{}"); } catch (e) { prog = {}; }

  var data = SUBJECTS.map(function (s) {
    var d = prog[s] || { right: 0, total: 0 };
    return { name: s, right: d.right || 0, total: d.total || 0, pct: d.total ? Math.round(100 * d.right / d.total) : 0 };
  });

  var attempted = data.reduce(function (a, d) { return a + d.total; }, 0);
  if (!attempted) { $("pa-empty").hidden = false; $("pa-wrap").hidden = true; return; }

  var totalRight = data.reduce(function (a, d) { return a + d.right; }, 0);
  var overall = Math.round(100 * totalRight / attempted);

  /* donut: each subject's slice grows with its share of correct answers */
  var r = 66, cx = 85, circ = 2 * Math.PI * r, angle = -90, segs = "";
  data.forEach(function (d, i) {
    var frac = totalRight > 0 ? d.right / totalRight : 1 / SUBJECTS.length;
    var len = Math.max(frac * circ - 4, 0.01);
    segs += '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + colors[i] +
      '" stroke-width="26" stroke-linecap="butt" stroke-dasharray="' + len + " " + (circ - len) +
      '" transform="rotate(' + angle + " " + cx + " " + cx + ')"></circle>';
    angle += frac * 360;
  });
  segs += '<text x="' + cx + '" y="' + (cx - 2) + '" text-anchor="middle" style="font-size:26px;font-weight:800;fill:currentColor">' + overall + "%</text>" +
    '<text x="' + cx + '" y="' + (cx + 18) + '" text-anchor="middle" style="font-size:10px;fill:currentColor;opacity:.65">OVERALL</text>';
  $("pa-donut").innerHTML = segs;

  /* legend with per-subject progress bars */
  var lg = $("pa-legend");
  lg.innerHTML = "";
  data.forEach(function (d, i) {
    var row = document.createElement("div");
    row.style.marginBottom = "10px";
    row.innerHTML =
      "<div style='display:flex;justify-content:space-between;font-size:.95em;margin-bottom:4px'>" +
      "<span><span style='display:inline-block;width:10px;height:10px;border-radius:3px;background:" + colors[i] + ";margin-right:6px'></span>" + d.name + "</span>" +
      "<b>" + d.right + "/" + d.total + " · " + d.pct + "%</b></div>" +
      "<div style='height:8px;border-radius:99px;background:rgba(127,127,127,.18);overflow:hidden'>" +
      "<div class='bar-fill' data-w='" + d.pct + "' style='height:100%;border-radius:99px;background:" + colors[i] + "'></div></div>";
    lg.appendChild(row);
  });

  /* advice */
  var scored = data.filter(function (d) { return d.total > 0; });
  var sorted = scored.slice().sort(function (a, b) { return b.pct - a.pct; });
  var advice = "";
  if (scored.length === 4) {
    advice = "Strongest: " + sorted[0].name + " (" + sorted[0].pct + "%). Weakest: " + sorted[sorted.length - 1].name + " (" + sorted[sorted.length - 1].pct + "%) — give it extra practice time this week.";
  } else {
    advice = "Keep taking quizzes in all four subjects — the chart gets sharper as each one fills in. So far: " +
      scored.map(function (d) { return d.name + " " + d.pct + "%"; }).join(", ") + ".";
  }
  if (overall >= 70) advice = "You are on track — " + advice;
  $("pa-advice").textContent = advice;
})();
