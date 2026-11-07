/* EduRise — zone rooms. WhatsApp-style chat between schools, anonymous by design. */
(function () {
  var wall = document.getElementById("chat-scroll");
  if (!wall) return;

  var roomsEl = document.getElementById("rooms");
  var listEl = document.getElementById("chat-list");
  var inputEl = document.getElementById("chat-input");
  var sendEl = document.getElementById("chat-send");
  var schoolEl = document.getElementById("chat-school");
  var roleEl = document.getElementById("chat-role");
  var headEl = document.getElementById("chat-title");
  var whoEl = document.getElementById("chat-who");
  var errEl = document.getElementById("chat-err");

  var room = "zone";
  var lastId = 0;
  var timer = null;
  var sending = false;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function hhmm(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function dayKey(iso) {
    var d = new Date(iso);
    return isNaN(d) ? "" : d.toDateString();
  }
  function dayLabel(iso) {
    var d = new Date(iso); if (isNaN(d)) return "";
    var today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    var y = new Date(today.getTime() - 864e5);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  }

  function bubble(m) {
    return '<div class="msg-row ' + (m.mine ? "mine" : "theirs") + '">'
      + '<div class="bubble ' + (m.mine ? "out" : "in") + '">'
      + (m.mine ? "" : '<span class="who">' + esc(m.author) + "</span>")
      + '<span class="txt">' + esc(m.body) + "</span>"
      + '<span class="meta">' + hhmm(m.created_at) + "</span>"
      + "</div></div>";
  }

  function render(list, reset) {
    if (reset) { listEl.innerHTML = ""; lastId = 0; }
    if (!list.length && reset) {
      listEl.innerHTML = '<p class="chat-empty">No messages yet in this room. Say hello to the zone.</p>';
      return;
    }
    var html = "";
    var prevDay = reset ? "" : listEl.dataset.lastDay || "";
    list.forEach(function (m) {
      var dk = dayKey(m.created_at);
      if (dk && dk !== prevDay) {
        html += '<div class="day-sep"><span>' + dayLabel(m.created_at) + "</span></div>";
        prevDay = dk;
      }
      html += bubble(m);
      if (m.id > lastId) lastId = m.id;
    });
    listEl.dataset.lastDay = prevDay;
    var nearBottom = wall.scrollHeight - wall.scrollTop - wall.clientHeight < 140;
    listEl.insertAdjacentHTML("beforeend", html);
    if (nearBottom || reset) { wall.scrollTop = wall.scrollHeight; hideJump(); }
    else { showJump(); }
  }

  function load(reset) {
    var url = "/api/v1/community/messages?channel=" + encodeURIComponent(room);
    if (!reset) url += "&after_id=" + lastId;
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (list) { render(list || [], reset); })
      .catch(function () {
        if (reset) listEl.innerHTML = '<p class="error">Rooms could not load. Check your connection.</p>';
      });
  }

  function loadSchools() {
    return fetch("/api/v1/community/schools")
      .then(function (r) { return r.json(); })
      .then(function (schools) {
        schoolEl.innerHTML = '<option value="">Your school</option>';
        (schools || []).forEach(function (s) {
          var o = document.createElement("option");
          o.value = s.id; o.textContent = s.name;
          schoolEl.appendChild(o);
        });
        try {
          var saved = JSON.parse(localStorage.getItem("edurise-chat-id") || "null");
          if (saved && saved.schoolId) { schoolEl.value = saved.schoolId; }
          if (saved && saved.role) { roleEl.value = saved.role; }
        } catch (e) {}
        updateWho();
      });
  }

  function updateWho() {
    var name = schoolEl.options[schoolEl.selectedIndex] ? schoolEl.options[schoolEl.selectedIndex].textContent : "";
    var ok = schoolEl.value !== "";
    whoEl.textContent = ok ? (roleEl.value === "teacher" ? "Teacher · " : "Student · ") + name : "Choose your school to join in";
    whoEl.classList.toggle("ready", ok);
  }

  function joinRoom(key, name) {
    room = key;
    Array.prototype.forEach.call(roomsEl.querySelectorAll(".room"), function (b) {
      b.classList.toggle("active", b.dataset.room === key);
    });
    if (headEl) headEl.textContent = name || "The zone";
    listEl.dataset.lastDay = "";
    listEl.innerHTML = '<p class="chat-empty">Loading…</p>';
    load(true);
  }

  roomsEl.addEventListener("click", function (e) {
    var b = e.target.closest(".room");
    if (!b) return;
    joinRoom(b.dataset.room, b.dataset.name);
  });

  function send() {
    if (sending) return;
    var body = inputEl.value.trim();
    errEl.textContent = "";
    if (!schoolEl.value) { errEl.textContent = friendlyError("school"); schoolEl.focus(); return; }
    if (!body) return;
    sending = true;
    sendEl.disabled = true;
    fetch("/api/v1/community/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: room, role: roleEl.value,
        school_id: parseInt(schoolEl.value, 10), body: body
      })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) {
          var det = res.d && (res.d.detail || res.d.message);
          errEl.textContent = friendlyError(typeof det === "string" ? det : "");
          return;
        }
        inputEl.value = "";
        inputEl.style.height = "auto";
        try {
          localStorage.setItem("edurise-chat-id", JSON.stringify({ schoolId: schoolEl.value, role: roleEl.value }));
        } catch (e) {}
        load(false);
      })
      .catch(function () { errEl.textContent = "Could not send. Check your connection and try again."; })
      .then(function () { sending = false; sendEl.disabled = false; inputEl.focus(); });
  }

  sendEl.addEventListener("click", send);
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === "Escape") { inputEl.blur(); }
  });
  inputEl.addEventListener("input", function () {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
  });
  schoolEl.addEventListener("change", updateWho);
  roleEl.addEventListener("change", updateWho);

  // live feel: poll for new messages
  function startPolling() {
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      if (!document.hidden && !sending) load(false);
    }, 2500);
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) load(false);
  });

  // ---- polish: counter, jump-to-latest, optimistic send ----
  var jumpEl = document.getElementById("chat-jump");
  var countEl = document.getElementById("chat-count");
  function showJump() { if (jumpEl) jumpEl.hidden = false; }
  function hideJump() { if (jumpEl) jumpEl.hidden = true; }
  function refreshCount() {
    if (!countEl) return;
    var n = inputEl.value.length;
    countEl.textContent = n > 300 ? n + " / 400" : "";
    countEl.classList.toggle("warn", n > 380);
    sendEl.disabled = sending || n === 0;
  }
  if (jumpEl) jumpEl.addEventListener("click", function () {
    wall.scrollTo({ top: wall.scrollHeight, behavior: "smooth" });
    hideJump();
  });
  wall.addEventListener("scroll", function () {
    if (wall.scrollHeight - wall.scrollTop - wall.clientHeight < 140) hideJump();
  });
  inputEl.addEventListener("input", refreshCount);
  refreshCount();

  function friendlyError(msg) {
    var m = String(msg || "");
    if (/rate|slow|hour/i.test(m)) return "Slow down a little — the zone allows 25 messages an hour.";
    if (/school/i.test(m)) return "Pick your school first so everyone knows where you are posting from.";
    if (/short|long|400/i.test(m)) return "Keep it between 2 and 400 characters.";
    if (/hold|review|pending/i.test(m)) return "That message is waiting for a moderator to look at it.";
    return m || "Message did not send. Try again.";
  }

  loadSchools();
  load(true);
  startPolling();
})();
