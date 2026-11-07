/* EduRise AI Tutor — ChatGPT-style chat UI (saved on-device only, NDPA-safe) */
(function () {
  var stream = null, subject = null, busy = false;
  var STREAMS = {
    science: ["Maths", "Physics", "Chemistry", "Biology", "Digital Tech", "Further Maths", "Agric Science", "English", "Civic Education", "Technical Drawing", "Geography"],
    commercial: ["Commerce", "Marketing", "Financial Accounting"],
    art: ["Literature-in-English", "Civic Education", "Economics", "History", "Government", "Maths", "English", "Food & Nutrition", "CRS"]
  };
  var chat = document.getElementById("chat");
  var history = [];
  function key() { return "edurise-tutor-" + stream + "-" + subject; }


  /* ---- turn any LaTeX the AI leaks into plain readable maths ---- */
  var SUP = {"0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","n":"ⁿ","-":"⁻","+":"⁺"};
  var SUB = {"0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉"};
  function mapChars(str, map) {
    var out = "";
    for (var i = 0; i < str.length; i++) { if (!map[str[i]]) return null; out += map[str[i]]; }
    return out;
  }
  function plainMath(t) {
    var s = String(t);
    s = s.replace(/\\\[([\s\S]*?)\\\]/g, "$1").replace(/\\\(([\s\S]*?)\\\)/g, "$1");
    s = s.replace(/\$\$([\s\S]*?)\$\$/g, "$1").replace(/\$([^$\n]{1,80})\$/g, "$1");
    for (var k = 0; k < 3; k++) {
      s = s.replace(/\\(?:d|t)?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
      s = s.replace(/\\sqrt\{([^{}]*)\}/g, "√($1)");
      s = s.replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, "$1");
    }
    s = s.replace(/\\left|\\right/g, "").replace(/\\[,;: !]/g, " ");
    var sym = {times:"×",div:"÷",cdot:"·",pm:"±",leq:"≤",le:"≤",geq:"≥",ge:"≥",neq:"≠",ne:"≠",approx:"≈",
      pi:"π",theta:"θ",alpha:"α",beta:"β",gamma:"γ",delta:"δ",Delta:"Δ",lambda:"λ",mu:"μ",sigma:"σ",omega:"ω",
      infty:"∞",rightarrow:"→",to:"→",Rightarrow:"⇒",leftarrow:"←",degree:"°",circ:"°",int:"∫",sum:"Σ",
      sin:"sin",cos:"cos",tan:"tan",log:"log",ln:"ln",lim:"lim",therefore:"∴",angle:"∠",perp:"⊥"};
    s = s.replace(/\\([A-Za-z]+)/g, function (m, w) { return sym[w] !== undefined ? sym[w] : w; });
    s = s.replace(/\^\{([^{}]*)\}/g, function (m, e) { var r = mapChars(e, SUP); return r !== null ? r : "^(" + e + ")"; });
    s = s.replace(/\^([0-9n])/g, function (m, e) { return SUP[e]; });
    s = s.replace(/_\{([^{}]*)\}/g, function (m, e) { var r = mapChars(e, SUB); return r !== null ? r : "_" + e; });
    s = s.replace(/([A-Za-z])_([0-9])/g, function (m, a, d) { return a + SUB[d]; });
    s = s.replace(/[{}]/g, "");
    /* single *italic* asterisks leaked from markdown -> plain emphasis */
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1$2");
    return s;
  }

  /* ---- tiny markdown for bot replies (safe: escape first) ---- */
  function renderMd(text) {
    var s = plainMath(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    s = s.replace(/```([\s\S]*?)```/g, function (_, c) { return "<code>" + c + "</code>"; });
    s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    var lines = s.split("\n"), html = [], inList = false;
    lines.forEach(function (ln) {
      var m = ln.match(/^\s*[-•*]\s+(.*)$/);
      if (m) { if (!inList) { html.push("<ul>"); inList = true; } html.push("<li>" + m[1] + "</li>"); }
      else { if (inList) { html.push("</ul>"); inList = false; } if (ln.trim() !== "") html.push("<p>" + ln + "</p>"); }
    });
    if (inList) html.push("</ul>");
    return html.join("") || "<p></p>";
  }

  function loadHistory() {
    try { history = JSON.parse(localStorage.getItem(key())) || []; } catch (e) { history = []; }
    chat.innerHTML = "";
    history.forEach(function (m) { addBubble(m.role, m.content, false); });
    chat.scrollTop = chat.scrollHeight;
  }

  function addBubble(role, text, scroll) {
    var row = document.createElement("div");
    row.className = "row " + (role === "user" ? "user" : "bot");
    if (role === "user") {
      var b = document.createElement("div");
      b.className = "msg user"; b.textContent = text;
      row.appendChild(b);
    } else {
      var av = document.createElement("span");
      av.className = "avatar"; av.innerHTML = role === "error" ? "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M10.29 3.86L8 8H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-4l-2.29-4.14a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/></svg>" : "<svg class='ic' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><rect x='4' y='4' width='16' height='16' rx='2'/><rect x='9' y='9' width='6' height='6'/><line x1='9' y1='1' x2='9' y2='4'/><line x1='15' y1='1' x2='15' y2='4'/><line x1='9' y1='20' x2='9' y2='23'/><line x1='15' y1='20' x2='15' y2='23'/><line x1='20' y1='9' x2='23' y2='9'/><line x1='20' y1='14' x2='23' y2='14'/><line x1='1' y1='9' x2='4' y2='9'/><line x1='1' y1='14' x2='4' y2='14'/></svg>";
      var wrap = document.createElement("div");
      wrap.className = "msg " + (role === "error" ? "bot error" : "bot");
      var body = document.createElement("div");
      body.className = "body";
      body.innerHTML = role === "error" ? "<p>" + text + "</p>" : renderMd(text);
      wrap.appendChild(av); wrap.appendChild(body);
      row.appendChild(wrap);
    }
    chat.appendChild(row);
    if (scroll !== false) chat.scrollTop = chat.scrollHeight;
  }

  function typingOn() {
    var row = document.createElement("div");
    row.className = "row bot"; row.id = "typing-row";
    row.innerHTML = '<span class="avatar"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg></span><div class="msg bot typing"><div class="body"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div></div>';
    chat.appendChild(row); chat.scrollTop = chat.scrollHeight;
  }
  function typingOff() {
    var t = document.getElementById("typing-row");
    if (t) t.remove();
  }

  function startChat() {
    document.getElementById("welcome").style.display = "none";
    document.getElementById("chat-view").style.display = "flex";
    document.getElementById("subject-title").textContent = subject;
    loadHistory();
    if (!history.length) {
      var hello = "Hi! I'm your " + subject + " tutor. What topic would you like to learn today? You can also just tell me what you find difficult.";
      history.push({ role: "assistant", content: hello });
      try { localStorage.setItem(key(), JSON.stringify(history)); } catch (e) {}
      addBubble("assistant", hello);
    }
    document.getElementById("chat-input").focus();
  }

  /* stream pills */
  document.querySelectorAll(".pill[data-stream]").forEach(function (c) {
    c.addEventListener("click", function () {
      document.querySelectorAll(".pill[data-stream]").forEach(function (x) { x.classList.remove("active"); });
      c.classList.add("active");
      stream = c.getAttribute("data-stream");
      var box = document.getElementById("subjects");
      box.innerHTML = "";
      STREAMS[stream].forEach(function (s) {
        var el = document.createElement("div");
        el.className = "chip"; el.textContent = s;
        el.addEventListener("click", function () { subject = s; startChat(); });
        box.appendChild(el);
      });
      document.getElementById("subjects-card").style.display = "";
    });
  });

  document.getElementById("switch-btn").addEventListener("click", function () {
    document.getElementById("chat-view").style.display = "none";
    document.getElementById("welcome").style.display = "flex";
    document.getElementById("chat-input").blur();
  });

  /* auto-grow textarea + Enter to send */
  var input = document.getElementById("chat-input");
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 150) + "px";
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); document.getElementById("chat-form").requestSubmit(); }
  });

  document.getElementById("chat-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (busy || !stream || !subject) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = ""; input.style.height = "auto"; input.disabled = true; busy = true;
    document.getElementById("send-btn").disabled = true;
    addBubble("user", text);
    history.push({ role: "user", content: text });
    try { localStorage.setItem(key(), JSON.stringify(history)); } catch (e) {}
    typingOn();

    fetch("/api/v1/tutor/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stream: stream, subject: subject, messages: history.slice(-16) })
    }).then(function (r) {
      if (r.status === 503) return { error: "tutor-not-configured" };
      if (!r.ok) return { error: "tutor-unavailable" };
      return r.json();
    }).then(function (data) {
      typingOff();
      var reply;
      if (data && data.reply) {
        reply = data.reply;
        history.push({ role: "assistant", content: reply });
        try { localStorage.setItem(key(), JSON.stringify(history)); } catch (e) {}
        addBubble("assistant", reply);
      } else if (data && data.error === "tutor-not-configured") {
        addBubble("error", "The tutor brain is still being connected. Your school admin needs to switch it on with an AI key — tell them you're ready to learn!");
      } else {
        addBubble("error", "Sorry, the tutor is taking a break (network hiccup). Please try again in a moment.");
      }
    }).catch(function () {
      typingOff();
      addBubble("error", "No connection. Check your internet and try again.");
    }).finally(function () {
      input.disabled = false; busy = false;
      document.getElementById("send-btn").disabled = false;
      input.focus();
    });
  });
})();
