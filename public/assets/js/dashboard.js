// Staff dashboard logic: load profile, tasks, and (for admins) staff management.
(function () {
  const $ = (id) => document.getElementById(id);

  /* ---------- School profile (about, programmes, image, publish) ---------- */
  let profileImage = null;

  function resizeImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file.type.startsWith("image/")) return reject(new Error("Not an image"));
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var max = 600, w = img.width, h = img.height;
        if (Math.max(w, h) > max) { var k = max / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        var data = c.toDataURL("image/jpeg", 0.82);
        if (data.length > 700000) { data = c.toDataURL("image/jpeg", 0.6); }
        resolve(data);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
      img.src = url;
    });
  }

  async function loadProfile() {
    try {
      var r = await fetch("/api/v1/staff/profile", { credentials: "include" });
      if (!r.ok) { $("profile-card").style.display = "none"; return; }
      var p = await r.json();
      var form = $("profile-form");
      form.about.value = p.about || "";
      form.programmes.value = p.programmes || "";
      form.is_published.checked = !!p.is_published;
      if (p.image_data) {
        var prev = $("profile-img-preview");
        prev.src = p.image_data; prev.style.display = "";
      }
      profileImage = p.image_data || null;
    } catch (e) { $("profile-card").style.display = "none"; }
  }

  $("img-tile") && $("img-tile").addEventListener("click", function () {
    $("profile-img").click();
  });

  $("profile-img") && $("profile-img").addEventListener("change", async function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      profileImage = await resizeImage(file);
      var prev = $("profile-img-preview");
      prev.src = profileImage; prev.style.display = "";
      $("profile-err").textContent = "";
    } catch (e) {
      $("profile-err").textContent = "Could not use that image. Try a JPG or PNG.";
    }
  });

  $("profile-form") && $("profile-form").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    $("profile-err").textContent = ""; $("profile-ok").hidden = true;
    var body = {
      about: this.about.value,
      programmes: this.programmes.value,
      is_published: this.is_published.checked,
      image_data: profileImage,
    };
    try {
      var r = await fetch("/api/v1/staff/profile", {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      $("profile-ok").hidden = false;
    } catch (e) {
      $("profile-err").textContent = "Could not save. Check your connection and try again.";
    }
  });

  loadProfile();

  function greetingFor(name) {
    const hour = new Date().getHours();
    const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return part + ", " + name.split(" ")[0];
  }

  function taskCard(task) {
    const card = document.createElement("div");
    card.className = "card";
    const due = task.due_at ? " · due " + task.due_at : "";
    card.innerHTML =
      "<h3>" + task.title + "</h3>" +
      "<span class='badge status-" + task.status + "'>" + task.status.replace(/_/g, " ") + "</span>" +
      "<span class='muted' style='margin-left:8px;font-size:13px'>" + (task.priority || "normal") + " priority" + due + "</span>";
    if (task.description) {
      const d = document.createElement("p");
      d.className = "muted";
      d.textContent = task.description;
      card.appendChild(d);
    }

    const actions = document.createElement("div");
    actions.style.marginTop = "10px";
    const next = document.createElement("select");
    next.style.width = "auto";
    const options = {
      in_progress: "Start / in progress",
      blocked: "Blocked",
      submitted_for_review: "Submit for review",
      completed: "Mark completed",
    };
    const placeholder = document.createElement("option");
    placeholder.textContent = "Update status…";
    placeholder.value = "";
    next.appendChild(placeholder);
    Object.keys(options).forEach(function (k) {
      const o = document.createElement("option");
      o.value = k; o.textContent = options[k];
      if (task.status === k) { o.disabled = true; }
      next.appendChild(o);
    });
    const msg = document.createElement("span");
    msg.className = "error";
    next.addEventListener("change", async function () {
      if (!next.value) { return; }
      msg.textContent = "";
      try {
        await SCP.updateTask(task.id, { status: next.value });
        window.location.reload();
      } catch (e) {
        msg.textContent = e.message;
      }
    });
    actions.appendChild(next);
    actions.appendChild(msg);
    card.appendChild(actions);
    return card;
  }

  async function loadAdminPanel() {
    $("invite-form").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      $("invite-err").textContent = ""; $("invite-ok").hidden = true;
      const form = new FormData(ev.target);
      try {
        await SCP.inviteStaff({
          email: form.get("email"),
          display_name: form.get("display_name"),
          role: form.get("role"),
        });
        $("invite-ok").textContent = "Invite sent. They activate their account at first sign-in.";
        $("invite-ok").hidden = false;
        ev.target.reset();
        await loadStaff();
      } catch (e) {
        $("invite-err").textContent = e.message;
      }
    });
    await loadStaff();
  }

  async function loadStaff() {
    const box = $("staff-list");
    try {
      const members = await SCP.listStaff();
      box.innerHTML = members.map(function (m) {
        return "<div style='padding:6px 0;border-bottom:1px solid var(--border);font-size:14px'>" +
          "<b>" + m.display_name + "</b> · " + m.email +
          " · <span class='badge'>" + m.role.replace(/_/g, " ") + "</span> · " + m.status +
          "</div>";
      }).join("");
    } catch (e) {
      box.innerHTML = "<p class='error'>" + e.message + "</p>";
    }
  }

  async function init() {
    try {
      const me = await SCP.me();
      $("greeting").textContent = greetingFor(me.display_name);
      $("role-line").textContent =
        "Signed in as " + me.email + " · role: " + me.role.replace(/_/g, " ");
      if (me.role === "school_admin") {
        $("admin-panel").hidden = false;
        await loadAdminPanel();
      }
      const tasks = await SCP.listMyTasks();
      const list = $("task-list");
      list.innerHTML = "";
      if (!tasks.length) {
        list.innerHTML = "<p class='muted'>No tasks assigned to you yet.</p>";
      }
      tasks.forEach(function (t) { list.appendChild(taskCard(t)); });
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        window.location.href = "sign-in.html";
        return;
      }
      $("greeting").textContent = "Something went wrong";
      $("role-line").textContent = e.message;
    }
  }

  $("signout") && $("signout").addEventListener("click", async function (ev) {
    ev.preventDefault();
    try { await SCP.signOut(); } catch (_) { /* ignore */ }
    window.location.href = "sign-in.html";
  });

  init();
})();

/* ---------- Zone registration queue (platform reviewers) ---------- */
(function () {
  fetch("/api/v1/registrations/whoami", { credentials: "include" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (w) {
      if (!w || !w.is_reviewer) return;
      document.getElementById("review-panel").hidden = false;
      loadQueue();
    }).catch(function () {});

  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function loadQueue() {
    var box = document.getElementById("review-list");
    fetch("/api/v1/registrations/queue", { credentials: "include" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var q = d.queue || [];
        if (!q.length) {
          box.innerHTML = '<p class="muted">All clear — no schools waiting for verification.</p>';
          return;
        }
        box.innerHTML = "";
        q.forEach(function (item) {
          var div = document.createElement("div");
          div.className = "rev-item";
          var meta = [item.zone, item.school_type, item.institution_level].filter(Boolean).join(" · ");
          var contact = esc(item.contact_name || "") + " &lt;" + esc(item.contact_email) + "&gt;";
          div.innerHTML =
            "<div class='rev-head'><b>" + esc(item.school_name) + "</b></div>" +
            "<div class='rev-q'>" + esc(meta) + "</div>" +
            "<p class='rev-opt'>Contact: " + contact + (item.contact_phone ? " · " + esc(item.contact_phone) : "") + "</p>" +
            (item.evidence_ref ? "<p class='rev-opt'>Evidence: " + esc(item.evidence_ref) + "</p>" : "") +
            "<div style='display:flex;gap:8px;margin-top:10px'>" +
            "<button class='btn accent' data-approve='" + item.id + "' type='button'>Approve &amp; verify</button>" +
            "<button class='btn-ghost danger' data-reject='" + item.id + "' type='button'>Reject</button></div>";
          box.appendChild(div);
        });
        box.querySelectorAll("[data-approve]").forEach(function (b) {
          b.addEventListener("click", function () { decide(b.getAttribute("data-approve"), "approve", b); });
        });
        box.querySelectorAll("[data-reject]").forEach(function (b) {
          b.addEventListener("click", function () { decide(b.getAttribute("data-reject"), "reject", b); });
        });
      }).catch(function () {
        box.innerHTML = '<p class="muted">Could not load the queue.</p>';
      });
  }

  function decide(id, action, btn) {
    if (action === "reject" && !confirm("Reject this school registration?")) return;
    btn.disabled = true; btn.textContent = "Working…";
    fetch("/api/v1/registrations/" + id + "/" + action, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: action === "approve" ? "Verified by the zone education office." : "Did not meet verification requirements." })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d.detail || "Failed");
        if (window.eduriseCelebrate) window.eduriseCelebrate(24);
        loadQueue();
      }).catch(function (e) { btn.disabled = false; btn.textContent = e.message; });
  }
})();
