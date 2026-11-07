/* Sign-in-first school registration with automated verification. */
(function () {
  var gate = document.getElementById("gate");
  var formCard = document.getElementById("form-card");
  var statusCard = document.getElementById("status-card");
  
  function paintStep(n) {
    var items = document.querySelectorAll("#steps .step");
    items.forEach(function (li, i) {
      li.classList.toggle("done", i < n);
      li.classList.toggle("current", i === n);
    });
  }

  function refreshStatus() {
    SCP.listMyRegistrations().then(function (list) {
      var box = document.getElementById("my-status");
      if (!list.length) { statusCard.hidden = true; return; }
      statusCard.hidden = false;
      box.innerHTML = "";
      list.forEach(function (r) {
        var line = document.createElement("p");
        line.style.cssText = "display:flex;justify-content:space-between;gap:10px;align-items:center;border-bottom:1px solid var(--border);padding:8px 0;margin:0";
        var label = document.createElement("span");
        label.innerHTML = "<b>" + r.school_name + "</b><br><small class=\"muted\">" + (r.review_note || "") + "</small>";
        var badge = document.createElement("span");
        badge.className = "badge status-" + r.status;
        badge.textContent = r.status === "approved" ? "approved" : r.status === "rejected" ? "not approved" : "in review";
        line.appendChild(label); line.appendChild(badge);
        box.appendChild(line);
      });
    }).catch(function () { statusCard.hidden = true; });
  }

  function showForm(me) {
    gate.hidden = true;
    var aside = document.querySelector(".reg-split");
    if (aside) aside.classList.add("signed-in");
    formCard.hidden = false;
    paintStep(1);
    var chip = document.getElementById("who-chip");
    chip.innerHTML = "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><rect x='3' y='11' width='18' height='11' rx='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/></svg> Signed in as <b>" + me.email + "</b> — this becomes the school admin account";
    var n = document.querySelector('input[name="contact_name"]');
    if (n && !n.value && me.display_name && me.display_name !== me.email) n.value = me.display_name;
    refreshStatus();
  }

  var mode = "signup";
  var COPY = {
    signup: {
      title: "Create your school admin account",
      copy: "New to EduRise? Continue with Google to create your account, then tell us about your school. Your Google account becomes the school administrator. No passwords, and it stops fake registrations.",
      sw: 'Already have an account? <a href="#" id="sw-link">Log in</a>',
    },
    login: {
      title: "Welcome back",
      copy: "Log in with the Google account you used before. If you already run a school on EduRise we will take you to your dashboard. Otherwise you can continue registering one.",
      sw: 'New here? <a href="#" id="sw-link">Create an account</a>',
    },
  };
  function setMode(m) {
    mode = m;
    document.getElementById("tab-signup").classList.toggle("active", m === "signup");
    document.getElementById("tab-login").classList.toggle("active", m === "login");
    document.getElementById("gate-title").textContent = COPY[m].title;
    document.getElementById("gate-copy").textContent = COPY[m].copy;
    document.getElementById("gate-switch").innerHTML = COPY[m].sw;
    document.getElementById("gate-err").textContent = "";
    var link = document.getElementById("sw-link");
    if (link) link.addEventListener("click", function (e) { e.preventDefault(); setMode(m === "signup" ? "login" : "signup"); });
    renderGoogle();
  }
  document.getElementById("tab-signup").addEventListener("click", function () { setMode("signup"); });
  document.getElementById("tab-login").addEventListener("click", function () { setMode("login"); });

  function renderGoogle() {
    if (!window.google || !google.accounts) return;
    var box = document.getElementById("google-button");
    box.innerHTML = "";
    google.accounts.id.renderButton(box, {
      theme: "outline", size: "large",
      text: mode === "signup" ? "signup_with" : "signin_with",
    });
  }

  function nextTarget() {
    var next = new URLSearchParams(window.location.search).get("next");
    return next && next.indexOf("/") === 0 && next.indexOf("//") !== 0 ? next : null;
  }

  async function afterAuth() {
    var a = await SCP.applicant();
    if (a.has_school && a.role) {
      // existing school admin / staff: continue where they were headed
      window.location.href = nextTarget() || "/dashboard";
      return;
    }
    showForm({ email: a.email, display_name: a.display_name });
  }

  // already signed in (applicant or staff)? skip straight on
  SCP.applicant().then(function (a) {
    if (a.has_school && a.role) {
      // school admin/staff: continue where they were headed
      window.location.href = nextTarget() || "/dashboard";
      return;
    }
    showForm({ email: a.email, display_name: a.display_name });
    var chip = document.getElementById("who-chip");
    if (chip) {
      var so = document.getElementById("reg-signout");
      if (chip && !so) {
        var a2 = document.createElement("a");
        a2.href = "#"; a2.id = "reg-signout";
        a2.textContent = "Sign out";
        a2.style.cssText = "margin-left:10px;font-weight:700;color:#F2762E";
        a2.addEventListener("click", function (e) {
          e.preventDefault();
          SCP.signOut().then(function () { window.location.href = "/register"; }).catch(function () { window.location.href = "/register"; });
        });
        chip.appendChild(document.createTextNode(" "));
        chip.appendChild(a2);
      }
    }
  }).catch(function () {
    gate.hidden = false;
    paintStep(0);
    setMode("signup");
  });
  function statusOnlyIfAdmin() { /* existing admins still see their submissions list */ }

  window.addEventListener("load", function () {
    if (!window.google || !google.accounts) return;
    google.accounts.id.initialize({
      client_id: window.SCP_CONFIG.GOOGLE_CLIENT_ID,
      callback: async function (response) {
        var errBox = document.getElementById("gate-err");
        errBox.textContent = "";
        try {
          var res = await SCP.signUpWithGoogleCredential(response.credential);
          if (mode === "login" && res.has_school) { window.location.href = "/dashboard"; return; }
          if (mode === "signup" && res.has_school) {
            errBox.innerHTML = 'That Google account already runs a school. <a href="/dashboard">Go to your dashboard</a>.';
            return;
          }
          if (mode === "login" && res.new_account) {
            // they tried to log in but had no account: we created one, tell them
          }
          await afterAuth();
        } catch (e) {
          errBox.textContent = e.message;
        }
      },
    });
    renderGoogle();
  });

  document.getElementById("reg-form").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var err = document.getElementById("err");
    var ok = document.getElementById("ok");
    var result = document.getElementById("result-card");
    err.textContent = ""; ok.hidden = true; result.hidden = true;
    var form = new FormData(ev.target);
    if (form.get("hp_field")) { err.textContent = "Submission blocked. Please refresh and try again."; return; }
    if (!navigator.onLine) { err.textContent = "You appear to be offline."; return; }
    var payload = {
      school_name: form.get("school_name").trim(),
      state: form.get("state").trim(),
      lga: form.get("lga") ? form.get("lga").trim() : null,
      school_type: form.get("school_type"),
      institution_level: form.get("institution_level") || "secondary",
      contact_name: form.get("contact_name").trim(),
      contact_phone: form.get("contact_phone") ? form.get("contact_phone").trim() : null,
      school_website: form.get("school_website") ? form.get("school_website").trim() : null,
      evidence_ref: form.get("evidence_ref") ? form.get("evidence_ref").trim() : null,
    };
    var btn = document.getElementById("submit-btn");
    btn.disabled = true; btn.textContent = "Verifying…";
    try {
      var res = await SCP.registerMySchool(payload);
      formCard.hidden = true;
      result.hidden = false;
      var title = document.getElementById("result-title");
      var body = document.getElementById("result-body");
      if (res.verification === "auto") {
        paintStep(3);
        title.innerHTML = "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><circle cx='12' cy='8' r='7'/><polyline points='8.21 13.89 7 23 12 20 17 23 15.79 13.88'/></svg> Approved instantly";
        body.innerHTML = "<b>" + res.school_name + "</b> is verified and live on EduRise. Setting up your school takes 2 minutes…";
        setTimeout(function () { window.location.href = "/setup"; }, 2200);
      } else {
        paintStep(2);
        title.innerHTML = "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><circle cx='12' cy='12' r='10'/><polyline points='12 6 12 12 16 14'/></svg> In review";
        body.innerHTML = "<b>" + res.school_name + "</b> is queued for a quick manual check (usually 1-2 days). " +
          "You can watch the live status below — we'll also email you at your Google address when it's decided.";
      }
      refreshStatus();
    } catch (e) {
      err.textContent = e.message;
      formCard.hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = "Verify my school";
    }
  });
})();
