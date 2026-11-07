/* EduRise Virtual Competitions — hub, quiz player, live leaderboard. */
(function () {
  "use strict";
  var API = "/api/v1/competitions";
  var cat = "secondary";
  var me = { signed_in: false, is_organizer: false, has_school: false, school_name: "", school_id: null };
  var board = [];
  var currentT = null, myState = null, pollTimer = null;
  var quiz = null;

  function $(id) { return document.getElementById(id); }
  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    if (opts.body && typeof opts.body !== "string") opts.body = JSON.stringify(opts.body);
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.detail || ("Request failed (" + r.status + ")"));
        return data;
      });
    });
  }

  /* ---------------- auth state ---------------- */
  function applyStudentState() {
    return fetch("/api/v1/competitions/student/me", { credentials: "include" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.school_id) {
          me.signed_in = true;
          me.has_school = true;
          me.school_id = d.school_id;
          me.school_name = d.school_name || "your school";
          me.is_student = true;
        }
      }).catch(function () {});
  }

  fetch("/api/v1/auth/me").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (d && d.id) {
      me.signed_in = true;
      me.has_school = !!d.active_school_id;
      me.school_id = d.active_school_id || null;
      me.school_name = d.active_school_name || "your school";
      me.email = d.email || "";
    }
    if (!me.signed_in) return applyStudentState();
  }).catch(function () {}).then(function () {
    return api("/whoami").then(function (w) { me.is_organizer = w.is_organizer; }).catch(function () {});
  }).then(function () {
    if (me.is_organizer && $("create-panel")) $("create-panel").hidden = false;
    var strip = $("me-strip");
    if (strip) {
      if (me.signed_in && me.has_school) {
        strip.innerHTML = "⚔ Competing for <b>" + esc(me.school_name) + "</b>"
          + (me.is_student ? " <span class='muted'>(student)</span>" : "")
          + (me.is_student ? " · <a href='#' id='student-switch'>switch school</a>" : "")
          + " — join a tournament below";
        strip.hidden = false;
        var sw = document.getElementById("student-switch");
        if (sw) sw.addEventListener("click", function (e) { e.preventDefault(); openStudentPicker(); });
      } else if (me.signed_in) {
        strip.innerHTML = "⚔ Signed in as <b>" + esc(me.email || "") + "</b> — register your school to enter";
        strip.hidden = false;
      } else {
        strip.innerHTML = "⚔ <b>Student?</b> Compete for your school — <a href='#' id='student-pick'>choose your school</a>"
          + " · <a href='/register?next=%2Fcompetitions'>School staff sign in</a>";
        strip.hidden = false;
        var pk = document.getElementById("student-pick");
        if (pk) pk.addEventListener("click", function (e) { e.preventDefault(); openStudentPicker(); });
      }
    }
    loadList();
  });

  function openStudentPicker() {
    var old = document.getElementById("student-picker");
    if (old) { old.remove(); return; }
    var ov = document.createElement("div");
    ov.id = "student-picker";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(5,8,20,.72);z-index:200;display:grid;place-items:center;padding:20px";
    ov.innerHTML = "<div style='background:var(--card,#1e293b);border:1px solid var(--border,#2d3652);border-radius:16px;padding:20px;max-width:420px;width:100%;max-height:75vh;overflow:auto'>"
      + "<h3 style='margin:0 0 4px'>Compete for your school</h3>"
      + "<p class='muted' style='margin:0 0 12px;font-size:13px'>Pick your school — no account needed, and nothing personal is stored. Your scores count for your school.</p>"
      + "<div id='student-schools'><p class='muted'>Loading schools…</p></div>"
      + "<p style='margin:12px 0 0'><button class='btn-ghost' id='student-cancel' style='width:100%'>Cancel</button></p></div>";
    document.body.appendChild(ov);
    document.getElementById("student-cancel").addEventListener("click", function () { ov.remove(); });
    fetch("/api/v1/competitions/student/schools", { credentials: "include" })
      .then(function (r) { return r.ok ? r.json() : { schools: [] }; })
      .then(function (d) {
        var box = document.getElementById("student-schools");
        box.innerHTML = "";
        (d.schools || []).forEach(function (sc) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "btn-ghost";
          b.style.cssText = "display:block;width:100%;text-align:left;margin:6px 0;padding:10px 12px;border:1.5px solid var(--border,#2d3652)";
          b.innerHTML = "<b>" + esc(sc.name) + "</b> <span class='muted' style='font-size:12px'>· " + esc(sc.institution_level || "secondary") + "</span>";
          b.addEventListener("click", function () {
            fetch("/api/v1/competitions/student/session", {
              method: "POST", credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ school_id: sc.id })
            }).then(function (r) {
              if (!r.ok) throw new Error("Could not select that school.");
              window.location.reload();
            }).catch(function (e) { alert(e.message); });
          });
          box.appendChild(b);
        });
        if (!(d.schools || []).length) box.innerHTML = "<p class='muted'>No verified schools yet.</p>";
      });
  }

  /* ---------------- hub list ---------------- */
  function loadList() {
    var box = $("t-list");
    if (!box) return;
    box.innerHTML = '<p class="muted">Loading tournaments…</p>';
    api("/tournaments?category=" + cat).then(function (d) {
      if (!d.tournaments.length) {
        box.innerHTML = '<div class="tt-empty"><b>No tournaments yet</b><span>When the education office opens a competition, it will appear here. Check back soon.</span></div>';
        return;
      }
      box.innerHTML = "";
      d.tournaments.forEach(function (t) {
        var row = document.createElement("div");
        row.className = "t-row";
        var pill = t.status === "live" ? "<span class='live-pill'>Live</span>" : "<span class='ended-pill'>Ended</span>";
        var sub = (t.organizer_name || "");
        if (t.teams) sub += " · " + t.teams + " school" + (t.teams === 1 ? "" : "s");
        if (t.attempts) sub += " · " + t.attempts + " rounds played";
        row.innerHTML = "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M6 9H4.5a2.5 2.5 0 0 1 0-5H6'/><path d='M18 9h1.5a2.5 2.5 0 0 0 0-5H18'/><path d='M4 22h16'/><path d='M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22'/><path d='M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22'/><path d='M18 2H6v7a6 6 0 0 0 12 0V2Z'/></svg>"
          + "<div class='t-copy'><b>" + esc(t.name) + " " + pill + "</b>"
          + "<span class='muted'>" + esc(sub) + "</span></div>"
          + "<button class='row-btn' data-t='" + t.id + "'>Sign in</button>";
        row.addEventListener("click", function (e) {
          if (e.target.closest && e.target.closest(".row-btn")) return;
          showDetail(t.id);
        });
        box.appendChild(row);
        paintRowBtn(row, t);
      });
    }).catch(function (e) { box.innerHTML = '<p class="muted">' + esc(e.message) + "</p>"; });
  }

  /* smart button on each hub row: Sign in -> Join for X -> Enter arena */
  function shortName(n) {
    n = n || "your school";
    return n.length > 22 ? n.slice(0, 21) + "…" : n;
  }

  function paintRowBtn(row, t) {
    var btn = row.querySelector(".row-btn");
    if (!btn) return;
    if (!me.signed_in) {
      btn.className = "row-btn"; btn.textContent = "Sign in to enter";
      btn.disabled = false;
      btn.onclick = function (e) { e.stopPropagation(); location.href = "/register?next=%2Fcompetitions"; };
      return;
    }
    if (!me.has_school) {
      btn.className = "row-btn"; btn.textContent = "Register my school";
      btn.disabled = false;
      btn.onclick = function (e) { e.stopPropagation(); location.href = "/register?next=%2Fcompetitions"; };
      return;
    }
    if (t.status && t.status !== "live") {
      /* ended tournaments: view only, never offer join */
      btn.className = "row-btn ghost"; btn.textContent = "View";
      btn.disabled = false;
      btn.onclick = function (e) { e.stopPropagation(); showDetail(t.id); };
      return;
    }
    api("/tournaments/" + t.id + "/me").then(function (st) {
      if (st.joined) {
        btn.className = "row-btn"; btn.textContent = "Enter arena →";
        btn.disabled = false;
        btn.onclick = function (e) { e.stopPropagation(); showDetail(t.id); };
      } else {
        btn.className = "row-btn"; btn.textContent = "Join for " + shortName(me.school_name);
        btn.disabled = false;
        btn.onclick = function (e) {
          e.stopPropagation();
          btn.disabled = true; btn.textContent = "Joining…";
          api("/tournaments/" + t.id + "/join", { method: "POST" }).then(function () {
            if (window.eduriseCelebrate) window.eduriseCelebrate(30);
            btn.textContent = "Enter arena →"; btn.disabled = false;
            btn.onclick = function (ev) { ev.stopPropagation(); showDetail(t.id); };
            loadList();
          }).catch(function (err) {
            btn.disabled = false; btn.textContent = "Join for " + shortName(me.school_name);
            alert(err.message);
          });
        };
      }
    }).catch(function () {
      btn.className = "row-btn ghost"; btn.textContent = "View";
      btn.disabled = false;
      btn.onclick = function (e) { e.stopPropagation(); showDetail(t.id); };
    });
  }

  document.querySelectorAll("#cat-tabs .cat-tab").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("#cat-tabs .cat-tab").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      cat = b.getAttribute("data-cat");
      $("cat-hint").textContent = cat === "secondary"
        ? "Every round is 5 questions — Science, Commercial or Art — generated fresh by the EduRise AI and marked instantly. Your school's best score per track counts."
        : "University rounds run the same way — Science, Commercial or Art — at undergraduate difficulty. Best score per track counts for your institution.";
      loadList();
    });
  });

  /* ---------------- organizer: create ---------------- */
  $("ct-submit") && $("ct-submit").addEventListener("click", function () {
    var name = $("ct-name").value.trim();
    if (name.length < 3) return alert("Give the tournament a name.");
    var btn = $("ct-submit"); btn.disabled = true; btn.textContent = "Creating…";
    api("/tournaments", { method: "POST", body: {
      name: name, category: $("ct-cat").value, description: $("ct-desc").value.trim() || null,
      organizer_name: $("ct-org").value.trim() || "Zone Education Office"
    }}).then(function (t) {
      btn.disabled = false; btn.textContent = "Create tournament";
      $("create-panel").removeAttribute("open");
      cat = t.category;
      document.querySelectorAll("#cat-tabs .cat-tab").forEach(function (x) {
        x.classList.toggle("active", x.getAttribute("data-cat") === cat);
      });
      loadList();
      showDetail(t.id);
    }).catch(function (e) { btn.disabled = false; btn.textContent = "Create tournament"; alert(e.message); });
  });

  /* ---------------- Zone Cup bracket ---------------- */
  function loadBracket() {
    var card = document.getElementById("bracket-card");
    var body = document.getElementById("bracket-body");
    if (!card || !currentT) return;
    fetch(API + "/tournaments/" + currentT + "/bracket", { credentials: "include" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.rounds || !d.rounds.length) { card.hidden = true; return; }
        card.hidden = false;
        var html = "<div class='bracket-wrap'>";
        d.rounds.forEach(function (rd) {
          html += "<div class='br-round'><h4>" + esc(rd.label) + "</h4>";
          rd.matches.forEach(function (m) {
            html += "<div class='br-match'>" + brTeam(m.a, m, "a") + brTeam(m.b, m, "b") + "</div>";
          });
          html += "</div>";
        });
        html += "</div>";
        if (d.champion) {
          html += "<div class='br-champ'><span class='trophy'>🏆</span><div><b style='font-size:16px'>" + esc(d.champion.name) +
            "</b> <span class='muted' style='font-size:13px'>· current Zone Cup leader on " + esc(d.champion.total || 0) + " points</span></div></div>";
        }
        body.innerHTML = html;
      }).catch(function () { card.hidden = true; });
  }

  function brTeam(t, m, side) {
    if (!t) return "<div class='br-team empty'>Awaiting school</div>";
    var win = m.winner_id === t.id;
    var pill = "";
    if (side === "b" && m.a && m.b) pill = "<span class='br-vs'>VS</span>";
    else if ((m.a && !m.b) || (!m.a && m.b)) pill = "<span class='byout'>BYE</span>";
    return "<div class='br-team " + (win ? "win" : (m.winner_id ? "lose" : "")) + "'>"
      + pill
      + "<span style='overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>" + esc(t.name) + "</span>"
      + "<span class='br-score'>" + (t.total || 0) + "</span></div>";
  }

  /* ---------------- tournament detail ---------------- */
  function showDetail(tid) {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    currentT = tid;
    $("detail").hidden = false;
    var hub = $("t-list").closest("main");
    if (hub) hub.hidden = true;
    api("/tournaments/" + tid).then(function (t) {
      $("t-name").textContent = t.name;
      $("t-organizer").textContent = t.organizer_name || "Zone Education Office";
      $("t-desc").textContent = t.description || "";
      var pill = t.status === "live" ? "<span class='live-pill'>Live</span>" : "<span class='ended-pill'>Ended</span>";
      $("t-meta").innerHTML = pill + "<span class='muted'>" + (t.category === "secondary" ? "Secondary schools" : "Universities") + "</span>";
      $("end-btn").hidden = !(me.is_organizer && t.status === "live");
      $("end-btn").textContent = "End tournament";
      loadLeaderboard();
      pollTimer = setInterval(loadLeaderboard, 6000);
      loadBracket();
      loadMyState();
    }).catch(function (e) { alert(e.message); });
  }

  function paintBest() {
    document.querySelectorAll(".track-best").forEach(function (em) {
      var b = myState && myState.best && myState.best[em.getAttribute("data-best")];
      em.textContent = b != null ? "Best: " + b + "/50" : "";
    });
  }

  function loadMyState() {
    var hint = $("round-hint"), joinBtn = $("join-btn"), note = $("join-note");
    var h1 = $("how-1"), h2 = $("how-2"), h3 = $("how-3");
    function step(cur) {
      [h1, h2, h3].forEach(function (li, i) {
        li.className = i + 1 < cur ? "done" : (i + 1 === cur ? "now" : "");
      });
    }
    if (!me.signed_in) {
      step(1);
      hint.innerHTML = "You're one tap away. Sign in with the Google account your school gave you.";
      joinBtn.hidden = false; joinBtn.disabled = false;
      joinBtn.textContent = "Sign in to represent your school";
      joinMode = "signin";
      paintBest();
      return;
    }
    if (!me.has_school) {
      step(2);
      hint.textContent = "Almost there — register your school once, then you can enter any tournament.";
      joinBtn.hidden = false; joinBtn.disabled = false;
      joinBtn.textContent = "Register my school";
      joinMode = "register";
      return;
    }
    api("/tournaments/" + currentT + "/me").then(function (s) {
      myState = s;
      paintBest();
      if (!s.joined) {
        step(2);
        hint.textContent = "One tap to enter " + (me.school_name || "your school") + " into this competition.";
        joinBtn.hidden = false;
        joinBtn.disabled = false;
        joinBtn.textContent = "Join for " + shortName(me.school_name);
        joinMode = "join";
        note.textContent = "";
      } else {
        step(4);
        hint.innerHTML = "You're in! <b>Enter the arena below</b> — pick Science, Commercial or Art. 5 AI questions, instant marking.";
        joinBtn.hidden = true;
        note.textContent = "";
      }
    }).catch(function (e) { hint.textContent = e.message; });
  }

  var joinMode = "join"; /* join | signin | register */
  function doJoin() {
    if (joinMode === "signin" || joinMode === "register") { location.href = "/register?next=%2Fcompetitions"; return; }
    var b = $("join-btn");
    b.disabled = true; b.textContent = "Joining…";
    api("/tournaments/" + currentT + "/join", { method: "POST" }).then(function () {
      b.hidden = true;
      if (window.eduriseCelebrate) window.eduriseCelebrate(30);
      loadMyState();
      loadLeaderboard();
    }).catch(function (e) {
      b.disabled = false; b.textContent = "Join for " + shortName(me.school_name);
      alert(e.message);
    });
  }
  $("join-btn") && $("join-btn").addEventListener("click", doJoin);

  $("end-btn") && $("end-btn").addEventListener("click", function () {
    if (!confirm("End this tournament? The leaderboard freezes and no new rounds can be played.")) return;
    api("/tournaments/" + currentT + "/status", { method: "POST", body: { status: "ended" } })
      .then(function () { showDetail(currentT); })
      .catch(function (e) { alert(e.message); });
  });

  $("back-btn") && $("back-btn").addEventListener("click", function () {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    $("detail").hidden = true;
    var hub = $("t-list").closest("main");
    if (hub) hub.hidden = false;
    currentT = null;
    loadList();
  });

  /* ---------------- leaderboard (live) ---------------- */
  function loadLeaderboard() {
    var box = $("lb-list");
    if (!box) return;
    api("/tournaments/" + currentT + "/leaderboard").then(function (d) {
      board = d.leaderboard || [];
      renderBattles();
      if (!board.length) {
        box.innerHTML = '<p class="muted">No schools on the board yet. Be the first to play a round.</p>';
        return;
      }
      box.innerHTML = "";
      d.leaderboard.forEach(function (r, i) {
        var div = document.createElement("div");
        div.className = "lb-row";
        var rank = i + 1;
        var medal = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
        div.innerHTML = "<span class='lb-rank " + medal + "'>" + rank + "</span>"
          + "<span class='lb-name'>" + esc(r.name) + "<br><span class='lb-sub'>Sci " + r.science + " · Com " + r.commercial + " · Art " + r.art + "</span></span>"
          + "<span class='lb-total'>" + r.total + "</span>";
        box.appendChild(div);
      });
    }).catch(function () {});
  }

  /* ---------------- battle board (VS cards) ---------------- */
  function renderBattles() {
    var bb = $("battle-board");
    if (!bb) return;
    if (board.length < 2) {
      bb.innerHTML = '<div class="tt-empty"><b>Waiting for challengers…</b><span>The first school VS school match-up appears as soon as a second school joins and plays a round.</span></div>';
      return;
    }
    bb.innerHTML = "";
    for (var i = 0; i < board.length; i += 2) {
      var a = board[i], b = board[i + 1];
      var card = document.createElement("div");
      card.className = "vs-card" + ((a.school_id === me.school_id || (b && b.school_id === me.school_id)) ? " mine" : "");
      var nameB = b ? esc(b.name) : "— bye —";
      var aLead = b ? a.total > b.total : true;
      var bLead = b ? b.total > a.total : false;
      card.innerHTML =
        "<div class='vs-side" + (aLead ? " leading" : "") + "'><div class='vs-name'>" + esc(a.name) + (a.school_id === me.school_id ? " (you)" : "") + "</div>" +
        "<div class='vs-score'>" + a.total + "</div><span class='vs-tag'>" + (!b ? "Auto-win" : aLead ? "Leading" : a.total === b.total ? "Tied" : "Trailing") + "</span></div>" +
        "<div class='vs-vs'>VS</div>" +
        "<div class='vs-side" + (bLead ? " leading" : "") + "'><div class='vs-name'>" + nameB + (b && b.school_id === me.school_id ? " (you)" : "") + "</div>" +
        "<div class='vs-score'>" + (b ? b.total : "–") + "</div><span class='vs-tag'>" + (!b ? "Waiting" : bLead ? "Leading" : a.total === b.total ? "Tied" : "Trailing") + "</span></div>";
      bb.appendChild(card);
    }
  }

  function findOpponent() {
    if (board.length < 2) return "???";
    var idx = -1;
    for (var i = 0; i < board.length; i++) if (board[i].school_id === me.school_id) { idx = i; break; }
    if (idx > 0) return board[idx - 1].name;
    if (idx === 0) return board[1].name;
    return board[0].name;
  }

  function showVsIntro(track, cb) {
    var o = $("vs-overlay");
    if (!o) { cb(); return; }
    $("vs-me").textContent = me.school_name || "Your school";
    $("vs-opp").textContent = findOpponent();
    $("vs-track").textContent = track + " battle · 5 questions · best score counts";
    o.hidden = false;
    setTimeout(function () { o.hidden = true; cb(); }, 2300);
  }

  /* ---------------- quiz player ---------------- */
  document.querySelectorAll(".track-card").forEach(function (b) {
    b.addEventListener("click", function () { startRound(b.getAttribute("data-track")); });
  });

  function startRound(track) {
    if (!me.signed_in || !me.has_school) return;
    if (myState && !myState.joined) return alert("Join this tournament for your school first.");
    var overlay = $("quiz-overlay");
    $("q-track").textContent = track;
    $("q-progress").textContent = "Generating your questions…";
    $("q-question").textContent = "The EduRise AI is writing a fresh round for your school.";
    $("q-options").innerHTML = "";
    $("q-barfill").style.width = "0%";
    overlay.hidden = false;
    document.body.style.overflow = "hidden";

    api("/tournaments/" + currentT + "/round/start", { method: "POST", body: { track: track } })
      .then(function (d) {
        quiz = { track: track, attemptId: d.attempt_id, questions: d.questions, idx: 0, answers: [], seconds: d.seconds_per_question, timer: null };
        showVsIntro(track, showQuestion);
      })
      .catch(function (e) {
        overlay.hidden = true;
        document.body.style.overflow = "";
        alert(e.message);
      });
  }

  function showQuestion() {
    var q = quiz.questions[quiz.idx];
    $("q-progress").textContent = "Question " + (quiz.idx + 1) + " of " + quiz.questions.length;
    $("q-question").textContent = q.q;
    var opts = $("q-options");
    opts.innerHTML = "";
    q.options.forEach(function (o, i) {
      if (!o) return;
      var b = document.createElement("button");
      b.className = "q-opt";
      b.type = "button";
      b.innerHTML = "<span class='key'>" + "ABCD".charAt(i) + "</span><span>" + esc(o) + "</span>";
      b.addEventListener("click", function () { pick(i); });
      opts.appendChild(b);
    });
    startTimer();
  }

  function startTimer() {
    clearInterval(quiz.timer);
    var left = quiz.seconds;
    $("q-seconds").textContent = left;
    $("q-barfill").style.width = "100%";
    var started = Date.now();
    quiz.timer = setInterval(function () {
      left = quiz.seconds - Math.floor((Date.now() - started) / 1000);
      $("q-seconds").textContent = Math.max(0, left);
      $("q-barfill").style.width = Math.max(0, left / quiz.seconds * 100) + "%";
      if (left <= 0) { clearInterval(quiz.timer); pick(-1); }
    }, 250);
  }

  function pick(i) {
    clearInterval(quiz.timer);
    quiz.answers[quiz.idx] = i;
    if (i >= 0) {
      var btns = $("q-options").children;
      for (var k = 0; k < btns.length; k++) btns[k].disabled = true;
      if (btns[i]) btns[i].classList.add("picked");
    }
    quiz.idx++;
    if (quiz.idx < quiz.questions.length) setTimeout(showQuestion, 450);
    else setTimeout(submitRound, 550);
  }

  function submitRound() {
    var track = quiz.track;
    var attempt = quiz.attemptId;
    $("quiz-overlay").hidden = true;
    document.body.style.overflow = "";
    $("detail").hidden = true;
    $("result").hidden = false;
    $("r-track").textContent = track + " round";
    $("r-score").textContent = "Marking…";
    $("r-note").textContent = "The AI is marking your answers.";
    $("r-review").innerHTML = "";

    fetch(API + "/rounds/" + attempt + "/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: quiz.answers })
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.detail || "Submit failed");
        return d;
      });
    }).then(function (d) {
      $("r-score").textContent = d.score + "/" + d.max_score;
      $("r-note").textContent = (d.new_record ? "New best for your school in this track! " : "Your school's best in this track is " + d.school_best + "/" + d.max_score + ". ") + "The leaderboard updated live.";
      var rev = $("r-review");
      rev.innerHTML = "";
      d.review.forEach(function (rv) {
        var div = document.createElement("div");
        div.className = "rev-item" + (rv.correct ? "" : " wrong");
        var optsHtml = "";
        rv.options.forEach(function (o, i) {
          if (!o) return;
          var cls = i === rv.answer ? "ok" : (i === rv.given ? "bad" : "");
          var mark = i === rv.answer ? "✓" : (i === rv.given ? "✗" : "·");
          optsHtml += "<p class='rev-opt " + cls + "'>" + mark + " " + esc(o) + "</p>";
        });
        div.innerHTML = "<div class='rev-head'>" + (rv.correct ? "Correct +10" : "Missed") + "</div>"
          + "<div class='rev-q'>" + esc(rv.q) + "</div>" + optsHtml
          + (rv.explanation ? "<p class='rev-why'>" + esc(rv.explanation) + "</p>" : "");
        rev.appendChild(div);
      });
      loadMyState();
    }).catch(function (e) {
      $("r-score").textContent = "–";
      $("r-note").textContent = e.message;
    });
  }

  $("r-again") && $("r-again").addEventListener("click", function () {
    $("result").hidden = true;
    $("detail").hidden = false;
    startRound(quiz ? quiz.track : "science");
  });

  $("r-back") && $("r-back").addEventListener("click", function () {
    $("result").hidden = true;
    $("detail").hidden = false;
    showDetail(currentT);
  });
})();
