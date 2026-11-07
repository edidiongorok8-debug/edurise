/* EduRise — controlled zone wall.
   Posts are school-attributed and anonymous: no names, no contact details. */
(function () {
  var feed = document.getElementById("feed");
  if (!feed) return;

  var schoolSel = document.getElementById("school");
  var roleSel = document.getElementById("role");
  var bodyEl = document.getElementById("body");
  var countEl = document.getElementById("count");
  var msgEl = document.getElementById("msg");
  var postBtn = document.getElementById("post");
  var topics = document.getElementById("topics");
  var filter = document.getElementById("filter");
  var currentTopic = "general";
  var currentFilter = "all";

  function timeAgo(iso) {
    if (!iso) return "";
    var then = new Date(iso).getTime();
    if (isNaN(then)) return "";
    var mins = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.round(hrs / 24);
    return days === 1 ? "yesterday" : days + "d ago";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function loadSchools() {
    fetch("/api/v1/community/schools")
      .then(function (r) { return r.json(); })
      .then(function (schools) {
        schoolSel.innerHTML = '<option value="">Choose your school</option>';
        (schools || []).forEach(function (s) {
          var o = document.createElement("option");
          o.value = s.id || s.school_id || "";
          o.textContent = s.name;
          schoolSel.appendChild(o);
        });
        // remember the last school this device posted for
        try {
          var last = localStorage.getItem("edurise-wall-school");
          if (last) schoolSel.value = last;
        } catch (e) {}
      })
      .catch(function () {
        schoolSel.innerHTML = '<option value="">Schools could not load</option>';
      });
  }

  function render(posts) {
    if (!posts.length) {
      feed.innerHTML = '<div class="card empty"><b>The wall is quiet.</b><p class="muted small">Be the first from your school to post something worth reading.</p></div>';
      return;
    }
    feed.innerHTML = posts.map(function (p) {
      return '<article class="card post">'
        + '<div class="post-head"><span class="avatar ' + (p.role === "teacher" ? "t" : "s") + '">'
        + (p.role === "teacher" ? "T" : "S") + "</span>"
        + '<div><b>' + esc(p.author) + "</b>"
        + '<div class="muted small">' + esc(p.topic) + " · " + timeAgo(p.created_at) + "</div></div>"
        + '<button class="report" data-id="' + p.id + '" title="Report this post">Report</button></div>'
        + '<p class="post-body">' + esc(p.body).replace(/\n/g, "<br>") + "</p>"
        + "</article>";
    }).join("");
  }

  function loadFeed() {
    var url = "/api/v1/community/posts";
    if (currentFilter !== "all") url += "?topic=" + encodeURIComponent(currentFilter);
    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (posts) { render(posts || []); })
      .catch(function () {
        feed.innerHTML = '<p class="error">The wall could not load. Check your connection and refresh.</p>';
      });
  }

  // topic chips in the composer
  topics.addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b) return;
    Array.prototype.forEach.call(topics.querySelectorAll(".chip"), function (c) { c.classList.remove("active"); });
    b.classList.add("active");
    currentTopic = b.dataset.topic;
  });

  // filter chips on the wall
  filter.addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b) return;
    Array.prototype.forEach.call(filter.querySelectorAll(".chip"), function (c) { c.classList.remove("active"); });
    b.classList.add("active");
    currentFilter = b.dataset.filter;
    loadFeed();
  });

  bodyEl.addEventListener("input", function () {
    countEl.textContent = bodyEl.value.length + " / 600";
  });

  postBtn.addEventListener("click", function () {
    msgEl.textContent = "";
    var body = bodyEl.value.trim();
    var schoolId = parseInt(schoolSel.value, 10);
    if (!schoolId) { msgEl.textContent = "Choose your school first."; return; }
    if (body.length < 12) { msgEl.textContent = "Say a little more, at least 12 characters."; return; }
    postBtn.disabled = true;
    postBtn.textContent = "Posting…";
    fetch("/api/v1/community/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school_id: schoolId, role: roleSel.value, topic: currentTopic, body: body }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) {
          var detail = res.d && (res.d.detail || res.d.message);
          msgEl.textContent = typeof detail === "string" ? detail : "That post did not go through.";
          return;
        }
        bodyEl.value = "";
        countEl.textContent = "0 / 600";
        try { localStorage.setItem("edurise-wall-school", schoolSel.value); } catch (e) {}
        msgEl.style.color = "var(--ok, #1a7f37)";
        msgEl.textContent = res.d.message || "Posted.";
        loadFeed();
        setTimeout(function () { msgEl.style.color = ""; msgEl.textContent = ""; }, 5000);
      })
      .catch(function () {
        msgEl.textContent = "Could not reach the wall. Try again.";
      })
      .then(function () {
        postBtn.disabled = false;
        postBtn.textContent = "Post to the zone";
      });
  });

  feed.addEventListener("click", function (e) {
    var b = e.target.closest(".report");
    if (!b) return;
    b.disabled = true;
    b.textContent = "Reported";
    fetch("/api/v1/community/posts/" + b.dataset.id + "/report", { method: "POST" }).catch(function () {});
  });

  loadSchools();
  loadFeed();
})();
