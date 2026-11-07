// EduRise JAMB Practice Test — timed mini mock, estimated score out of 400, school matches.
// Privacy: results and best score save only on this device (localStorage), never sent anywhere.
(function () {
  var BANK = window.EDURISE_PRACTICE || {};
  var SCHOOLS = window.EDURISE_SCHOOLS || [];
  var PER_SUBJECT = 5, SECONDS = 30;
  var $ = function (id) { return document.getElementById(id); };
  var questions = [], i = 0, picked = -1, locked = false, perm = [];
  var answers = [], tick = null, left = SECONDS;

  function pref(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function setPref(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function shuffle(a) { var b = a.slice(); for (var n = b.length - 1; n > 0; n--) { var r = Math.floor(Math.random() * (n + 1)); var t = b[n]; b[n] = b[r]; b[r] = t; } return b; }
  function letter(n) { return "ABCD"[n]; }

  function showBest() {
    var b = parseInt(pref("edurise-practice-best", "0"), 10);
    $("pt-best").textContent = b > 0 ? "Your best estimated score so far: " + b + "/400. Can you beat it?" : "First attempt — good luck!";
  }

  function buildTest() {
    questions = [];
    Object.keys(BANK).forEach(function (subject) {
      shuffle(BANK[subject]).slice(0, PER_SUBJECT).forEach(function (q) {
        questions.push({ subject: subject, q: q.q, opts: q.opts, a: q.a, why: q.why });
      });
    });
    questions = shuffle(questions);
  }

  function renderHome() {
    clearInterval(tick);
    $("pt-quiz").hidden = true; $("pt-results").hidden = true; $("pt-home").hidden = false;
    showBest();
  }

  function startTest() {
    buildTest();
    i = 0; answers = [];
    $("pt-home").hidden = true; $("pt-results").hidden = true; $("pt-quiz").hidden = false;
    showQuestion();
  }

  function showQuestion() {
    var q = questions[i];
    picked = -1; locked = false;
    perm = shuffle(q.opts.map(function (_, n) { return n; }));
    $("pt-progress").textContent = "Question " + (i + 1) + " of " + questions.length;
    $("pt-subject").textContent = q.subject;
    $("pt-question").textContent = q.q;
    $("pt-next").hidden = true;
    var box = $("pt-opts"); box.innerHTML = "";
    perm.forEach(function (origN, pos) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn pq-opt";
      b.style.cssText = "display:block;width:100%;text-align:left;margin:0 0 10px;font-weight:400;white-space:normal;background:transparent";
      b.textContent = letter(pos) + ". " + q.opts[origN];
      b.addEventListener("click", function () {
        if (locked) return;
        picked = pos;
        var all = box.querySelectorAll("button");
        all.forEach(function (el) { el.style.borderColor = ""; el.style.background = ""; });
        b.style.borderColor = "#F2762E";
        $("pt-next").hidden = false;
      });
      box.appendChild(b);
    });
    left = SECONDS;
    $("pt-timebar").style.transition = "none";
    $("pt-timebar").style.width = "100%";
    void $("pt-timebar").offsetWidth;
    $("pt-timebar").style.transition = "width " + SECONDS + "s linear";
    $("pt-timebar").style.width = "0%";
    clearInterval(tick);
    tick = setInterval(function () {
      left--;
      if (left <= 0) { clearInterval(tick); nextQuestion(); }
    }, 1000);
  }

  function nextQuestion() {
    clearInterval(tick);
    var q = questions[i];
    var correctPos = perm.indexOf(q.a);
    answers.push({ subject: q.subject, q: q.q, why: q.why, picked: picked, correctPos: correctPos, right: picked === correctPos });
    i++;
    if (i >= questions.length) { showResults(); } else { showQuestion(); }
  }

  function showResults() {
    $("pt-quiz").hidden = true; $("pt-results").hidden = false;
    var bySubject = {};
    answers.forEach(function (a) {
      bySubject[a.subject] = bySubject[a.subject] || { right: 0, total: 0 };
      bySubject[a.subject].total++;
      if (a.right) bySubject[a.subject].right++;
    });
    var est = 0;
    Object.keys(bySubject).forEach(function (s) { est += bySubject[s].right * (100 / PER_SUBJECT); });
    est = Math.round(est);

    var target = est, cur = 0;
    var anim = setInterval(function () {
      cur += Math.max(1, Math.ceil(target / 25));
      if (cur >= target) { cur = target; clearInterval(anim); }
      $("pt-score").textContent = cur;
    }, 40);
    $("pt-score").textContent = "0";

    try {
      var prog = JSON.parse(pref("edurise-progress", "{}"));
      Object.keys(bySubject).forEach(function (sb) {
        prog[sb] = prog[sb] || { right: 0, total: 0 };
        prog[sb].right += bySubject[sb].right; prog[sb].total += bySubject[sb].total;
      });
      setPref("edurise-progress", JSON.stringify(prog));
    } catch (e) {}
    var best = parseInt(pref("edurise-practice-best", "0"), 10);
    if (est > best) setPref("edurise-practice-best", String(est));
    if (window.eduriseCelebrate && (est >= 120 || est > best)) window.eduriseCelebrate(56);
    $("pt-verdict").textContent = est >= best && est > 0 ? "A new personal best! Based on " + answers.length + " questions — a rough estimate, not an official score." : "Based on " + answers.length + " questions — a rough estimate, not an official score. Best so far: " + best + "/400.";

    var bd = $("pt-breakdown"); bd.innerHTML = "";
    Object.keys(bySubject).forEach(function (s) {
      var v = bySubject[s];
      var row = document.createElement("div");
      row.style.cssText = "margin:0 0 10px";
      row.innerHTML =
        "<div style='display:flex;justify-content:space-between;font-size:.95em;margin-bottom:4px'><span>" + s + "</span><b>" + v.right + "/" + v.total + "</b></div>" +
        "<div style='height:8px;border-radius:99px;background:rgba(127,127,127,.18);overflow:hidden'><div style='height:100%;width:" + (v.right / v.total * 100) + "%;border-radius:99px;background:#2e9e5b'></div></div>";
      bd.appendChild(row);
    });

    var matches = [], close = [];
    SCHOOLS.forEach(function (s) {
      if (est >= s.cutoff) matches.push(s);
      else if (s.cutoff - est <= 40) close.push(s);
    });
    matches.sort(function (a, b) { return a.cutoff - b.cutoff; });
    close.sort(function (a, b) { return a.cutoff - b.cutoff; });
    var sb = $("pt-schools"); sb.innerHTML = "";
    function chip(s, tag, color) {
      var d = document.createElement("div");
      d.style.cssText = "border:1px solid rgba(127,127,127,.25);border-radius:12px;padding:10px 12px;margin-bottom:8px";
      var body = "Dear Admissions Office,\n\nI am a JAMB candidate interested in applying to " + s.name +
        ". I recently scored " + est + "/400 in a JAMB-style practice test (my official JAMB score is pending) and I would like to know more about the admission requirements, screening dates and available courses for the upcoming session.\n\nThank you.";
      var contact = "";
      if (s.email) contact += "<a class='btn' style='padding:8px 14px;font-size:13px;text-decoration:none' href='mailto:" + s.email + "?subject=" + encodeURIComponent("Admission enquiry - JAMB candidate") + "&body=" + encodeURIComponent(body) + "'>Email admissions</a> ";
      if (s.portal) contact += "<a class='btn secondary' style='padding:8px 14px;font-size:13px;text-decoration:none' target='_blank' rel='noopener' href='" + s.portal + "'>Admission portal</a>";
      d.innerHTML = "<div style='display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap'>" +
        "<span><b>" + s.name + "</b><br><small class='muted'>" + s.type + " · cutoff ~" + s.cutoff + "</small></span>" +
        "<span class='status-chip' style='background:" + color + "'>" + tag + "</span></div>" +
        (contact ? "<div style='display:flex;gap:8px;margin-top:10px;flex-wrap:wrap'>" + contact + "</div>" : "");
      sb.appendChild(d);
    }
    if (matches.length) matches.slice(0, 6).forEach(function (s) { chip(s, "Matches you", "#2e9e5b"); });
    if (close.length) close.slice(0, 6 - Math.min(matches.length, 6)).forEach(function (s) { chip(s, "Close — keep pushing", "#F2762E"); });
    if (!matches.length && !close.length) sb.innerHTML = "<p class='muted'>No close matches at this score yet — keep practising, and check the School Finder to explore all options.</p>";

    var rv = $("pt-review"); rv.innerHTML = "";
    answers.forEach(function (a, n) {
      var d = document.createElement("div");
      d.style.cssText = "border:1px solid rgba(127,127,127,.2);border-radius:12px;padding:10px 12px;margin-bottom:8px";
      var head = a.right ? "<b style='color:#2e9e5b'>Correct</b>" : "<b style='color:#d9534f'>" + (a.picked === -1 ? "Time ran out — answer was " : "Not quite — answer was ") + letter(a.correctPos) + "</b>";
      d.innerHTML = "<small class='muted'>" + (n + 1) + ". " + a.subject + "</small><br>" + a.q + "<br>" + head + (a.why ? "<br><small class='muted'>" + a.why + "</small>" : "");
      rv.appendChild(d);
    });
    window.scrollTo(0, 0);
  }

  $("pt-start").addEventListener("click", startTest);
  $("pt-next").addEventListener("click", nextQuestion);
  $("pt-retake").addEventListener("click", startTest);
  renderHome();
})();
