// Thin API client. All calls send cookies (session) and handle JSON errors.
(function () {
  const cfg = window.SCP_CONFIG;

  async function request(method, path, body) {
    const res = await fetch(cfg.API_BASE + path, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* empty body */ }
    if (!res.ok) {
      const detail = data && data.detail ? data.detail : "Request failed (" + res.status + ")";
      const err = new Error(detail);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  window.SCP = {
    signInWithGoogleCredential: (credential) => request("POST", "/auth/google", { credential }),
    me: () => request("GET", "/auth/me"),
    signUpWithGoogleCredential: (credential) => request("POST", "/auth/google/signup", { credential }),
    applicant: () => request("GET", "/auth/applicant"),
    signOut: () => request("POST", "/auth/signout"),
    listMyTasks: () => request("GET", "/tasks"),
    updateTask: (id, patch) => request("PATCH", "/tasks/" + id, patch),
    listStaff: () => request("GET", "/staff"),
    inviteStaff: (payload) => request("POST", "/staff/invites", payload),
    communitySchools: (state) => request("GET", "/community/schools" + (state ? "?state=" + encodeURIComponent(state) : "")),
    schoolMetrics: (slug) => request("GET", "/community/schools/" + encodeURIComponent(slug) + "/metrics"),
    upcomingEvents: () => request("GET", "/community/events"),
    registerSchool: (payload) => request("POST", "/registrations", payload),
    registerMySchool: (payload) => request("POST", "/registrations/mine", payload),
    listMyRegistrations: () => request("GET", "/registrations/mine"),
    getStaffProfile: () => request("GET", "/staff/profile"),
    updateStaffProfile: (patch) => request("PATCH", "/staff/profile", patch),
  };
})();
