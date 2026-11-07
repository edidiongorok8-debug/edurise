// EduRise Past Questions — subject picker, quiz runner, instant marking.
// Privacy: scores and answers save only on this device (localStorage), never sent anywhere.
(function () {
  var BANK = window.EDURISE_PQ;
  var SUBJECT_ICONS = {
    "Maths": "M9 3H5v18h4M15 3h4v18h-4M9 12h6",
    "English": "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
    "Chemistry": "M9 3v6M15 3v6M6 9h12v3a6 6 0 0 1-12 0zM12 21v-3",
    "Physics": "M12 2a10 10 0 1 0 10 10M12 12l7-7"
  };
  var $ = function (id) { return document.getElementById(id); };
  var sub = null, order = [], i = 0, score = 0, locked = false;
  var answers = [];

  function pref(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function setPref(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function bestKey(s) { return "edurise-pq-best-" + s.toLowerCase(); }

  function renderSubjects() {
    var box = $("pq-subjects");
    box.innerHTML = "";
    Object.keys(BANK).forEach(function (name) {
      var best = parseInt(pref(bestKey(name), "0"), 10);
      var card = document.createElement("button");
      card.type = "button";
      card.className = "feature-card";
      card.style.textAlign = "left";
      card.innerHTML =
        "<span class='feature-icon'><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='" + (SUBJECT_ICONS[name] || "M4 4h16v16H4z") + "'/></svg> </span>" +
        "<h3>" + name + "</h3>" +
        "<p class='muted'>" + BANK[name].length + " questions · instant marking</p>" +
        "<span class='status-chip live'>" + (best > 0 ? "Best: " + best + "/" + BANK[name].length : "Not attempted yet") + "</span>";
      card.addEventListener("click", function () { startQuiz(name); });
      box.appendChild(card);
    });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var j = a.length - 1; j > 0; j--) {
      var r = Math.floor(Math.random() * (j + 1));
      var t = a[j]; a[j] = a[r]; a[r] = t;
    }
    return a;
  }

  function startQuiz(name) {
    sub = name;
    order = shuffle(BANK[name]);
    i = 0; score = 0; answers = [];
    $("pq-home").hidden = true;
    $("pq-result").hidden = true;
    $("pq-quiz").hidden = false;
    showQuestion();
  }

  function letter(n) { return "ABCD"[n]; }

  var perm = [];

  function showQuestion() {
    var q = order[i];
    locked = false;
    // shuffle option order so the correct answer is never always A
    perm = shuffle(q.opts.map(function (_, n) { return n; }));
    $("pq-progress").textContent = (i + 1) + " / " + order.length + " · " + sub + " · " + score + " correct";
    $("pq-question").textContent = q.q;
    $("pq-explain").hidden = true;
    $("pq-next").hidden = true;
    var box = $("pq-opts");
    box.innerHTML = "";
    perm.forEach(function (origN, pos) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn pq-opt";
      b.style.cssText = "display:block;width:100%;text-align:left;margin:0 0 10px;font-weight:400;white-space:normal";
      b.textContent = letter(pos) + ". " + q.opts[origN];
      b.addEventListener("click", function () { pick(pos, b); });
      box.appendChild(b);
    });
  }

  function pick(n, btn) {
    if (locked) return;
    locked = true;
    var q = order[i];
    var correctPos = perm.indexOf(q.a);
    var buttons = $("pq-opts").querySelectorAll("button");
    buttons[correctPos].style.borderColor = "#2e9e5b";
    buttons[correctPos].style.color = "#2e9e5b";
    var correct = n === correctPos;
    if (!correct) {
      btn.style.borderColor = "#d9534f";
      btn.style.color = "#d9534f";
    } else {
      score++;
    }
    answers.push({ q: q.q, correct: correct, why: q.why, chosen: letter(n), right: letter(correctPos) });
    $("pq-why").textContent = (correct ? "Correct! " : "Not quite — the answer is " + letter(correctPos) + ". ") + q.why;
    $("pq-explain").hidden = false;
    var nx = $("pq-next");
    nx.hidden = false;
    nx.textContent = i + 1 >= order.length ? "See my score" : "Next question";
    nx.focus();
  }

  function finish() {
    $("pq-quiz").hidden = true;
    var total = order.length;
    $("pq-score").textContent = score + " / " + total;
    var pct = Math.round((score / total) * 100);
    $("pq-verdict").textContent =
      pct >= 80 ? "Excellent! You are exam-ready on this topic." :
      pct >= 50 ? "Good effort — review the ones you missed and try again." :
      "Keep practising. Read each explanation, then retry.";
    var rev = $("pq-review");
    rev.innerHTML = "";
    answers.forEach(function (a, n) {
      var p = document.createElement("p");
      p.style.cssText = "text-align:left;font-size:14px;border-bottom:1px solid var(--border);padding:8px 0;margin:0";
      p.innerHTML = "<b style='color:" + (a.correct ? "#2e9e5b" : "#d9534f") + "'>" + (a.correct ? "✓" : "✗") + "</b> " +
        a.q.replace(/&/g, "&amp;").replace(/</g, "&lt;") +
        "<br><small class='muted'>You: " + a.chosen + (a.correct ? "" : " · Correct: " + a.right) + "</small>";
      rev.appendChild(p);
    });
    var best = parseInt(pref(bestKey(sub), "0"), 10);
    if (score > best) setPref(bestKey(sub), String(score));
    try {
      var prog = JSON.parse(pref("edurise-progress", "{}"));
      prog[sub] = prog[sub] || { right: 0, total: 0 };
      prog[sub].right += score; prog[sub].total += total;
      setPref("edurise-progress", JSON.stringify(prog));
    } catch (e) {}
    if (window.eduriseCelebrate && (pct >= 50 || score > best)) window.eduriseCelebrate();
    $("pq-result").hidden = false;
    $("pq-result").scrollIntoView({ behavior: "smooth" });
  }

  $("pq-next").addEventListener("click", function () {
    i++;
    if (i >= order.length) finish(); else showQuestion();
  });
  $("pq-back").addEventListener("click", function () {
    $("pq-quiz").hidden = true; $("pq-result").hidden = true; $("pq-home").hidden = false;
    renderSubjects();
  });
  $("pq-again").addEventListener("click", function () { startQuiz(sub); });
  $("pq-home2").addEventListener("click", function () {
    $("pq-result").hidden = true; $("pq-home").hidden = false; renderSubjects();
  });

  renderSubjects();
})();
