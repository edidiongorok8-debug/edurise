/* EduRise — ambient background.
   Why: the zone should feel alive, like schools and students moving in one shared space.
   A soft network of drifting points (the zone), slow falling petals (the brand), and
   depth behind glassy cards. Built for phones: capped density, capped pixel ratio,
   paused when the tab is hidden, and a still frame for anyone who prefers reduced motion. */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var layer = document.createElement("div");
  layer.className = "ed-ambient";
  layer.setAttribute("aria-hidden", "true");
  var canvas = document.createElement("canvas");
  layer.appendChild(canvas);
  document.body.insertBefore(layer, document.body.firstChild);

  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = 1;
  var points = [], petals = [], letters = [], raf = null, running = false, scrollY = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var count = Math.round((W * H) / 20000);
    count = Math.max(34, Math.min(count, 110));
    points = [];
    for (var i = 0; i < count; i++) {
      points.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() * 2.2 + 1.3,
        warm: Math.random() < 0.55
      });
    }

    // the brand letters, drifting like they are part of the air
    var word = "EDURISE";
    letters = [];
    for (var q = 0; q < word.length; q++) {
      letters.push({
        ch: word[q],
        x: Math.random() * W,
        y: Math.random() * H,
        size: (W < 640 ? 42 : 70) + Math.random() * 46,
        vy: -(Math.random() * 0.18 + 0.05),
        vx: (Math.random() - 0.5) * 0.10,
        rot: (Math.random() - 0.5) * 0.5,
        spin: (Math.random() - 0.5) * 0.0025,
        a: Math.random() * 0.05 + 0.035
      });
    }

    var petalsN = W < 640 ? 5 : 9;
    petals = [];
    for (var j = 0; j < petalsN; j++) {
      petals.push({
        x: Math.random() * W,
        y: Math.random() * H,
        s: Math.random() * 10 + 8,
        vy: Math.random() * 0.22 + 0.07,
        vx: (Math.random() - 0.5) * 0.12,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.004,
        a: Math.random() * 0.14 + 0.10
      });
    }
  }

  function petal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, p.s, p.s * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    // drifting letters, gently parallaxed by scroll
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (var L = 0; L < letters.length; L++) {
      var g = letters[L];
      g.x += g.vx; g.y += g.vy; g.rot += g.spin;
      if (g.y < -90) { g.y = H + 80; g.x = Math.random() * W; }
      if (g.x < -90) g.x = W + 60; if (g.x > W + 90) g.x = -60;
      var drift = (scrollY * 0.06) % H;
      ctx.save();
      ctx.globalAlpha = g.a;
      ctx.translate(g.x, g.y - drift);
      ctx.rotate(g.rot);
      ctx.font = "800 " + g.size + "px Arial, Helvetica, sans-serif";
      ctx.fillStyle = "#F2762E";
      ctx.fillText(g.ch, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    // faint links: the zone, schools connected
    for (var i = 0; i < points.length; i++) {
      for (var j = i + 1; j < points.length; j++) {
        var dx = points[i].x - points[j].x;
        var dy = points[i].y - points[j].y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 26000) {
          var alpha = (1 - d2 / 26000) * 0.22;
          ctx.strokeStyle = "rgba(242,118,46," + (alpha * 1.7).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }
    }

    for (var k = 0; k < points.length; k++) {
      var p = points[k];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      ctx.beginPath();
      ctx.fillStyle = p.warm ? "rgba(242,118,46,0.85)" : "rgba(110,150,255,0.55)";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(242,118,46,1)";
    for (var m = 0; m < petals.length; m++) {
      var pt = petals[m];
      ctx.globalAlpha = pt.a;
      pt.x += pt.vx; pt.y += pt.vy; pt.rot += pt.spin;
      if (pt.y > H + 40) { pt.y = -30; pt.x = Math.random() * W; }
      if (pt.x < -40) pt.x = W + 30; if (pt.x > W + 40) pt.x = -30;
      petal(pt);
      ctx.globalAlpha = 1;
    }

    if (running) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  resize();
  if (reduce) {
    frame();               // one calm still frame, no motion
  } else {
    start();
  }

  var t;
  window.addEventListener("resize", function () {
    clearTimeout(t);
    t = setTimeout(function () { resize(); if (reduce) frame(); }, 180);
  });
  window.addEventListener("scroll", function () { scrollY = window.scrollY || 0; }, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (reduce) return;
    if (document.hidden) stop(); else start();
  });
})();
