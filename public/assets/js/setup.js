/* 4-step school setup wizard for newly approved school admins. */
(function () {
  var step = 0;
  var schoolName = "your school";
  var profile = { about: "", programmes: "", is_published: false };

  function paint() {
    for (var i = 0; i < 4; i++) {
      document.getElementById("step-" + i).hidden = i !== step;
      var d = document.getElementById("dot-" + i);
      d.classList.toggle("status-completed", i < step);
      d.classList.toggle("status-in_progress", i === step);
    }
  }

  SCP.me().then(function (me) {
    if (!me || !me.active_school_id) { window.location.href = "/register"; return; }
    SCP.listMyRegistrations().then(function (list) {
      var mine = list.find(function (r) { return r.status === "approved"; });
      if (mine) schoolName = mine.school_name;
      document.getElementById("welcome-body").innerHTML =
        "<b>" + schoolName + "</b> is verified and live on EduRise, and you (" + me.email + ") are its administrator. " +
        "Two more quick steps: your school's public profile and inviting your staff.";
      document.getElementById("done-body").innerHTML =
        "<b>" + schoolName + "</b> is live on EduRise. From your dashboard you can publish your profile, post updates and manage staff.";
      paint();
    }).catch(function () { paint(); });
  }).catch(function () { window.location.href = "/register"; });

  SCP.getStaffProfile().then(function (p) {
    profile = { about: p.about || "", programmes: p.programmes || "", is_published: !!p.is_published };
    var f = document.getElementById("profile-form");
    f.about.value = profile.about;
    f.programmes.value = profile.programmes;
  }).catch(function () {});

  document.getElementById("go-1").addEventListener("click", function () { step = 1; paint(); });

  document.getElementById("profile-form").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var err = document.getElementById("p-err");
    err.textContent = "";
    try {
      var p = await SCP.updateStaffProfile({
        about: this.about.value.trim(),
        programmes: this.programmes.value.trim(),
        is_published: profile.is_published,
      });
      profile.is_published = p.is_published;
      step = 2; paint();
    } catch (e) { err.textContent = e.message; }
  });

  var invited = [];
  document.getElementById("invite-form").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var err = document.getElementById("i-err");
    var ok = document.getElementById("i-ok");
    err.textContent = ""; ok.hidden = true;
    try {
      await SCP.inviteStaff({
        email: this.email.value.trim(),
        display_name: this.display_name.value.trim(),
        role: this.role.value,
      });
      invited.push(this.display_name.value.trim() + " (" + this.role.value.replace("teacher_staff", "teacher") + ")");
      var list = document.getElementById("invited-list");
      list.innerHTML = "<p class=\"muted\" style=\"margin-top:12px\"><svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/></svg> Invited so far: <b>" + invited.join("</b>, <b>") + "</b></p>";
      ok.textContent = "Invite sent! Add another or continue.";
      ok.hidden = false;
      this.reset();
    } catch (e) { err.textContent = e.message; }
  });

  document.getElementById("go-3").addEventListener("click", function () { step = 3; paint(); });
})();
