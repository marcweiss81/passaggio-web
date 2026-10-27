/* Passaggio website — the two "see it in action" animations.
   1. lessonDemo: scrolling note bars with a live pitch line; a flat phrase interrupts the lesson
      with a correction card, then singing resumes on pitch.
   2. weakDemo: the weak-areas analysis building a lesson from the singer's own tendencies.
   Both loop, pause when off-screen, and freeze for prefers-reduced-motion. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- lesson */
  function lessonDemo(root) {
    var canvas = root.querySelector("canvas");
    var card = root.querySelector(".demo-card");
    var ctx = canvas.getContext("2d");
    var GOLD = "#f5cc58", GOLD_CORE = "#fff1c9", ROSE = "#ff6f91", BRASS = "#c9ad7a";
    var MIST = "#a6a6a6", BONE = "#ece9df";
    var ROWS = 7, PX_PER_S = 120, PLAYHEAD = 0.34;
    /* The phrase: start time (s), length (s), row (0 = top), syllable, and whether it is sung flat. */
    var NOTES = [
      [0.4, 0.9, 5, "ah"], [1.5, 0.7, 4, "ee"], [2.4, 1.1, 3, "oo"], [3.7, 0.8, 4, "ah"],
      [4.7, 1.2, 2, "ee", "flat"], [6.1, 1.0, 2, "ah", "flat"],
      [7.4, 0.8, 3, "oo"], [8.4, 0.9, 2, "ee"], [9.5, 1.3, 1, "ah"], [11.0, 0.8, 2, "oo"], [12.0, 1.4, 3, "ah"]
    ];
    var FLAT_AT = 7.1;      /* the lesson stops here and the card appears */
    var CARD_FOR = 4.2;     /* seconds the card stays */
    var LOOP = 14.2;        /* lesson seconds per cycle (card time is on top) */
    var trail = [];         /* [x, y, colour] samples of the sung line, moving left */
    var lessonT = 0, cardT = 0, inCard = false, last = null, running = false, raf = 0;
    var W = 0, H = 0, dpr = 1;

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = root.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function rowY(r) { return 28 + r * ((H - 44) / (ROWS - 1)); }
    function barH() { return Math.max(12, (H - 44) / (ROWS - 1) * 0.62); }

    function step(dt) {
      if (inCard) {
        cardT += dt;
        if (cardT >= CARD_FOR) { inCard = false; card.classList.remove("show"); root.classList.remove("dim"); }
        return;
      }
      var before = lessonT;
      lessonT += dt;
      if (before < FLAT_AT && lessonT >= FLAT_AT) {
        inCard = true; cardT = 0; card.classList.add("show"); root.classList.add("dim");
      }
      if (lessonT >= LOOP) { lessonT = 0; trail = []; }
      /* sample the sung line at the playhead */
      var px = W * PLAYHEAD, y = null, col = GOLD;
      for (var i = 0; i < NOTES.length; i++) {
        var n = NOTES[i];
        if (lessonT >= n[0] && lessonT <= n[0] + n[1]) {
          var wob = Math.sin(lessonT * 11) * 1.6;
          if (n[4] === "flat") { y = rowY(n[2]) + barH() * 0.95 + wob; col = ROSE; }
          else { y = rowY(n[2]) + wob; col = GOLD; }
        }
      }
      if (y === null) {
        /* between notes: glide toward the next note, dim */
        var nxt = null;
        for (var k = 0; k < NOTES.length; k++) if (NOTES[k][0] > lessonT) { nxt = NOTES[k]; break; }
        y = nxt ? rowY(nxt[2]) + 10 : rowY(3); col = MIST;
      }
      for (var j = 0; j < trail.length; j++) trail[j][0] -= PX_PER_S * dt;
      trail.push([px, y, col]);
      while (trail.length && trail[0][0] < -10) trail.shift();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      /* rows */
      ctx.strokeStyle = "rgba(166,166,166,0.09)"; ctx.lineWidth = 1;
      for (var r = 0; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, rowY(r)); ctx.lineTo(W, rowY(r)); ctx.stroke(); }
      /* bars */
      var px = W * PLAYHEAD, bh = barH();
      for (var i = 0; i < NOTES.length; i++) {
        var n = NOTES[i], x0 = px + (n[0] - lessonT) * PX_PER_S, w = n[1] * PX_PER_S, y = rowY(n[2]) - bh / 2;
        if (x0 > W || x0 + w < 0) continue;
        var sung = lessonT > n[0], done = lessonT > n[0] + n[1], flat = n[4] === "flat";
        var lit = sung && !done && !flat;
        ctx.beginPath(); roundRect(x0, y, w, bh, bh / 2);
        if (lit) { ctx.shadowColor = GOLD; ctx.shadowBlur = 18; ctx.fillStyle = "rgba(245,204,88,0.42)"; }
        else if (sung && flat) { ctx.shadowBlur = 0; ctx.fillStyle = "rgba(166,166,166,0.06)"; }
        else if (sung) { ctx.shadowBlur = 0; ctx.fillStyle = "rgba(245,204,88,0.20)"; }
        else { ctx.shadowBlur = 0; ctx.fillStyle = "rgba(166,166,166,0.14)"; }
        ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = lit ? GOLD_CORE : (sung && !flat) ? GOLD : (sung && flat) ? "rgba(166,166,166,0.4)" : MIST;
        ctx.lineWidth = lit ? 1.5 : 1; ctx.stroke();
        ctx.fillStyle = BRASS; ctx.font = "500 11px Inter, system-ui, sans-serif"; ctx.letterSpacing = "0.06em";
        ctx.fillText(n[3], x0 + 8, y - 6);
      }
      /* playhead */
      ctx.fillStyle = "rgba(233,233,237,0.08)"; ctx.fillRect(px - 2, 0, 4, H);
      ctx.fillStyle = "rgba(233,233,237,0.6)"; ctx.fillRect(px, 0, 1, H);
      /* sung line */
      if (trail.length > 1) {
        ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
        for (var t = 1; t < trail.length; t++) {
          var a = trail[t - 1], b = trail[t];
          var alpha = Math.max(0, Math.min(1, b[0] / (px * 0.9)));
          ctx.strokeStyle = b[2]; ctx.globalAlpha = alpha * (b[2] === MIST ? 0.45 : 0.95);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      /* caption */
      ctx.fillStyle = BONE; ctx.font = "500 12px Inter, system-ui, sans-serif";
      ctx.fillText(inCard ? "Lesson paused" : "Warm-up 03 · five-note siren", 12, H - 10);
    }
    function roundRect(x, y, w, h, r) {
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function frame(ts) {
      if (!running) return;
      if (last === null) last = ts;
      var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
      step(dt); draw(); raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; last = null; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    size(); window.addEventListener("resize", size);
    if (reduceMotion) { lessonT = 5.2; for (var s = 0; s < 240; s++) step(1 / 60); draw(); return; }
    observe(root, start, stop);
  }

  /* ------------------------------------------------------------- weak areas */
  function weakDemo(root) {
    var phases = root.querySelectorAll("[data-phase]");
    var counter = root.querySelector(".demo-count");
    var order = ["listen", "note", "step", "vowel", "fault", "lesson"];
    var at = [0, 2.2, 4.0, 5.6, 7.2, 9.0], LOOP = 12.8;
    var t = 0, last = null, running = false, raf = 0;
    function apply() {
      var phase = 0;
      for (var i = 0; i < at.length; i++) if (t >= at[i]) phase = i;
      for (var p = 0; p < phases.length; p++) {
        var idx = order.indexOf(phases[p].getAttribute("data-phase"));
        phases[p].classList.toggle("on", idx <= phase);
        phases[p].classList.toggle("now", idx === phase);
      }
      if (counter) counter.textContent = String(Math.min(23, Math.floor(1 + t * 10)));
      root.classList.toggle("built", phase === order.length - 1);
    }
    function frame(ts) {
      if (!running) return;
      if (last === null) last = ts;
      t += Math.min(0.05, (ts - last) / 1000); last = ts;
      if (t >= LOOP) t = 0;
      apply(); raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; last = null; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    if (reduceMotion) { t = 9.5; apply(); return; }
    observe(root, start, stop);
  }

  function observe(el, onIn, onOut) {
    if (!("IntersectionObserver" in window)) { onIn(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) onIn(); else onOut(); });
    }, { threshold: 0.15 }).observe(el);
  }

  document.querySelectorAll(".demo-lesson").forEach(lessonDemo);
  document.querySelectorAll(".demo-weak").forEach(weakDemo);
})();
