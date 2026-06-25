/* grpoVidBench — study runner
   Generic, JSON-driven renderer for the three reviewer studies.
   Vanilla JS, no build step. All paths relative. */
(function () {
  "use strict";

  // ---------- tiny DOM helpers ----------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const root = $("#root");
  const titleBar = $("#study-title-bar");
  const saveStatus = $("#save-status");
  const progressWrap = $("#progress-bar-wrap");
  const progressFill = $("#progress-fill");
  const progressText = $("#progress-text");

  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") n.className = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function") n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    if (children != null) (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  // ---------- i18n shorthands (provided by i18n.js) ----------
  const I = window.I18N || { tr: function (s) { return s; }, tf: function (s) { return s; }, L: function (o, f) { return o ? o[f] : ""; }, current: function () { return "en"; }, onChange: function () {}, mountToggle: function () {} };
  const tr = function (s) { return I.tr(s); };          // translate a UI string
  const tf = function (s, p) { return I.tf(s, p); };     // translate a template "{x}" string
  const L = function (o, f) { return I.L(o, f); };        // localize a study/item field
  let redraw = function () {};                            // re-render the current screen on language switch

  // ---------- minimal markdown ----------
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function inlineMd(s) {
    return escapeHtml(s)
      .replace(/`([^`]+)`/g, (_, c) => "<code>" + c + "</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/_([^_\n]+)_/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function renderMarkdown(md) {
    if (!md) return "";
    const lines = String(md).replace(/\r\n/g, "\n").split("\n");
    let html = "", list = false;
    const closeList = () => { if (list) { html += "</ul>"; list = false; } };
    for (let raw of lines) {
      const line = raw.trimEnd();
      const h = /^(#{1,3})\s+(.*)$/.exec(line);
      const li = /^\s*[-*]\s+(.*)$/.exec(line);
      if (h) { closeList(); const lvl = h[1].length; html += "<h" + lvl + ">" + inlineMd(h[2]) + "</h" + lvl + ">"; }
      else if (li) { if (!list) { html += "<ul>"; list = true; } html += "<li>" + inlineMd(li[1]) + "</li>"; }
      else if (line === "") { closeList(); }
      else { closeList(); html += "<p>" + inlineMd(line) + "</p>"; }
    }
    closeList();
    return html;
  }

  // ---------- deterministic PRNG (seeded shuffle) ----------
  function hashStr(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededOrder(n, seed) {
    const idx = Array.from({ length: n }, (_, i) => i);
    const rng = mulberry32(hashStr(String(seed)));
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx;
  }

  // ---------- storage ----------
  // key includes the task group so different tasks of the same study don't share state
  function storageKey(studyId, task, reviewer) {
    return "grpovidbench:" + studyId + (task ? ":" + task : "") + ":" + (reviewer || "_");
  }
  function loadState(studyId, task, reviewer) {
    try { const r = localStorage.getItem(storageKey(studyId, task, reviewer)); return r ? JSON.parse(r) : null; }
    catch (e) { return null; }
  }
  function saveState(state) {
    try {
      localStorage.setItem(storageKey(state.study_id, state.task_group, state.reviewer_id), JSON.stringify(state));
      flashSaved();
    } catch (e) { /* ignore quota errors */ }
  }
  let savedTimer = null;
  function flashSaved() {
    saveStatus.innerHTML = '<span class="saved-pill"></span>';
    saveStatus.querySelector(".saved-pill").textContent = tr("Saved");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { saveStatus.innerHTML = ""; }, 1400);
  }

  // ---------- scale / dimension model ----------
  // task code -> human label (study.task_labels overrides these defaults)
  const TASK_LABELS = {
    TAL: "Temporal Action Localization (TAL)",
    NAP: "Next Action Prediction (NAP)",
    DVC: "Dense Video Captioning (DVC)",
    VS: "Video Summarization (VS)",
    CVS: "Critical View of Safety (CVS)",
  };
  function taskLabel(code) {
    if (code == null) return "";
    const m = (study && study.task_labels) || {};
    return tr(m[code] || TASK_LABELS[code] || code);
  }

  // Build the "Context" block: a clear instruction + the per-task L1/L2/L3 template.
  // Shown inline in the QA flow (just before the rating questions). Returns null if
  // the study defines no level guide for this item's task.
  function buildContext(item) {
    const guide = (study.level_guides && item.task) ? study.level_guides[item.task] : null;
    if (!guide) return null;
    const wrap = el("div", { class: "qa-block qa-context" });
    wrap.appendChild(el("div", { class: "qa-label", text: tr("Context — how to rate this reasoning") }));

    const taskName = taskLabel(item.task);
    const q = L(guide, "q");
    const tmpl = q
      ? "Read the model's reasoning <think> above. For this {task} item — {q} — a good trace must carry the three levels below. Check each level is present and correct, then answer the rating questions."
      : "Read the model's reasoning <think> above. For this {task} item, a good trace must carry the three levels below. Check each level is present and correct, then answer the rating questions.";
    wrap.appendChild(el("p", { class: "ctx-instr", text: tf(tmpl, { task: taskName, q: q }) }));

    const g = el("div", { class: "level-guide" });
    g.appendChild(el("div", { class: "lg-task", text: taskName + (q ? " — " + q : "") }));
    (guide.levels || []).forEach((lv) => {
      g.appendChild(el("div", { class: "lg-row" }, [
        el("span", { class: "lg-k", text: lv.k }),
        el("span", { class: "lg-d" }, [
          el("strong", { text: L(lv, "label") }),
          document.createTextNode(lv.desc ? " — " + L(lv, "desc") : ""),
        ]),
      ]));
    });
    wrap.appendChild(g);
    return wrap;
  }

  function dimType(dim) {
    if (dim.type) return dim.type;
    if (dim.scale) return "likert";
    if (dim.options) return "select";
    return "text";
  }
  function dimVisible(dim, item) {
    if (!dim.requires_field) return true;
    const v = item[dim.requires_field];
    return !(v == null || (typeof v === "string" && v.trim() === ""));
  }
  function dimRequired(dim) { return !dim.optional; }

  // ---------- frame player ----------
  const manifestCache = {};
  async function getManifest(dataset, videoId) {
    const key = dataset + "/" + videoId;
    if (manifestCache[key]) return manifestCache[key];
    const url = "./Videos/" + dataset + "/" + videoId + "/frames.json";
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error("frames.json HTTP " + res.status);
    const m = await res.json();
    manifestCache[key] = m;
    return m;
  }

  function FramePlayer(container, opts) {
    // opts: dataset, videoId, start, end, segments
    const LOOKAHEAD = 25;
    let manifest = null, frames = [], dir = "", nativeFps = 1, playFps = 5, timeline = "seconds";
    let index = 0, playing = false, speed = 1, rafTimer = null, lastTick = 0;
    let loIdx = 0, hiIdx = 0;   // navigable clip range (indices); restricts to the portion the model saw
    let destroyed = false;
    const requested = new Set();

    const stage = el("div", { class: "stage" });
    const img = el("img", { alt: "surgical video frame", decoding: "async" });
    const overlay = el("div", { class: "overlay", text: "buffering…" });
    stage.appendChild(img); stage.appendChild(overlay);

    const playBtn = el("button", { class: "pp", title: "Play / pause", "aria-label": "Play", html: "▶" });
    const timeLabel = el("span", { class: "time", text: "0.0 s" });
    const markers = el("div", { class: "scrub-markers" });
    const slider = el("input", { type: "range", min: "0", max: "0", value: "0", step: "1" });
    const scrubWrap = el("div", { class: "scrub-wrap" }, [markers, slider]);
    const speedBox = el("div", { class: "speed" });
    const speeds = [0.5, 1, 2, 4];
    const speedBtns = speeds.map((sp) =>
      el("button", { text: sp + "×", onclick: () => setSpeed(sp) }, null));
    speedBtns.forEach((b) => speedBox.appendChild(b));
    const note = el("div", { class: "player-note" });

    const controls = el("div", { class: "controls" }, [
      el("div", { class: "row" }, [playBtn, scrubWrap]),
      el("div", { class: "row" }, [timeLabel, el("span", { class: "spacer", style: "flex:1" }), speedBox]),
      note,
    ]);
    const wrap = el("div", { class: "player" }, [stage, controls]);
    container.appendChild(wrap);

    function frameUrl(i) { return dir + frames[i]; }
    // timeline label: source-seconds (default), normalized t in [0,1], or raw frame index
    function tlabel(i) {
      if (timeline === "normalized") return (frames.length > 1 ? (i / (frames.length - 1)).toFixed(2) : "0.00") + " · t";
      if (timeline === "index") return "frame " + (i + 1) + " / " + frames.length;
      return (i / nativeFps).toFixed(1) + " s";
    }
    // convert a window value (seconds | normalized fraction | index) to a frame index
    function toIndex(v) {
      if (timeline === "normalized") return v * (frames.length - 1);
      if (timeline === "index") return v;
      return v * nativeFps;
    }
    function preload(from) {
      for (let i = from; i < Math.min(hiIdx + 1, from + LOOKAHEAD); i++) {
        if (!requested.has(i)) { requested.add(i); const im = new Image(); im.src = frameUrl(i); }
      }
    }
    function setBuffering(on) { overlay.classList.toggle("show", on); overlay.classList.remove("error"); overlay.textContent = tr("buffering…"); }
    function showError(msg) { overlay.classList.add("show", "error"); overlay.textContent = msg; }

    function render() {
      if (destroyed) return;
      slider.value = String(index);
      timeLabel.textContent = tlabel(index);
      const url = frameUrl(index);
      if (img.getAttribute("src") !== url) {
        setBuffering(true);
        img.onload = () => setBuffering(false);
        img.onerror = () => showError(tf("Frame failed to load ({name})", { name: frames[index] }));
        img.src = url;
      }
      preload(index);
    }

    function setIndex(i, fromUser) {
      index = Math.max(loIdx, Math.min(hiIdx, Math.round(i)));
      if (fromUser) stop();
      render();
    }
    function setSpeed(sp) {
      speed = sp;
      speedBtns.forEach((b, k) => b.classList.toggle("active", speeds[k] === sp));
    }
    function tick(ts) {
      if (!playing) return;
      if (!lastTick) lastTick = ts;
      const dt = ts - lastTick;
      const interval = 1000 / (playFps * speed);
      if (dt >= interval) {
        lastTick = ts;
        if (index >= hiIdx) { stop(); return; }
        // only advance if current frame is loaded (graceful buffering)
        if (img.complete && img.naturalWidth > 0) setIndex(index + 1);
      }
      rafTimer = requestAnimationFrame(tick);
    }
    function play() {
      if (playing || frames.length === 0) return;
      if (index >= hiIdx) setIndex(loIdx);
      playing = true; lastTick = 0; playBtn.innerHTML = "❚❚"; playBtn.setAttribute("aria-label", "Pause");
      rafTimer = requestAnimationFrame(tick);
    }
    function stop() {
      playing = false; if (rafTimer) cancelAnimationFrame(rafTimer); rafTimer = null;
      playBtn.innerHTML = "▶"; playBtn.setAttribute("aria-label", "Play");
    }
    playBtn.addEventListener("click", () => (playing ? stop() : play()));
    slider.addEventListener("input", () => setIndex(parseInt(slider.value, 10), true));

    function drawMarkers() {
      clear(markers);
      const span = Math.max(1, hiIdx - loIdx);   // marker positions are relative to the visible clip
      const clipCount = hiIdx - loIdx + 1;
      const segs = [];
      if (opts.segments && opts.segments.length) {
        opts.segments.forEach((s) => segs.push([s[0], s[1]]));
      } else if (opts.start != null && opts.end != null) {
        segs.push([opts.start, opts.end]);
      }
      segs.forEach(([a, b]) => {
        const ia = Math.max(loIdx, Math.min(hiIdx, toIndex(a)));
        const ib = Math.max(loIdx, Math.min(hiIdx, toIndex(b)));
        const left = ((ia - loIdx) / span) * 100;
        const width = Math.max(1.2, ((ib - ia) / span) * 100);
        markers.appendChild(el("div", { class: "seg", style: "left:" + left + "%;width:" + width + "%" }));
      });
      const unit = timeline === "normalized" ? " t" : (timeline === "index" ? "" : " s");
      if (segs.length) {
        const lbl = tr(segs.length > 1 ? "Highlighted windows" : "Highlighted window");
        note.textContent = lbl + ": " +
          segs.map(([a, b]) => a.toFixed(timeline === "normalized" ? 2 : 1) + "–" + b.toFixed(timeline === "normalized" ? 2 : 1) + unit).join(", ");
      } else if (timeline === "normalized") {
        note.textContent = tf("{n} keyframes · timeline normalized 0.00–1.00", { n: clipCount });
      } else if (timeline === "index") {
        note.textContent = tf("{n} frames", { n: clipCount });
      } else {
        note.textContent = tf("Source: {fps} fps · {n} frames", { fps: nativeFps, n: clipCount });
      }
    }

    (async function init() {
      try {
        manifest = await getManifest(opts.dataset, opts.videoId);
        if (destroyed) return;
        frames = manifest.frames || [];
        dir = manifest.dir || ("./Videos/" + opts.dataset + "/" + opts.videoId + "/");
        nativeFps = manifest.native_fps || 1;
        playFps = manifest.default_playback_fps || 5;
        timeline = manifest.timeline || "seconds";
        if (!frames.length) { showError(tr("No frames in manifest.")); return; }
        // restrict the navigable range to the clip the model actually saw (if specified)
        loIdx = (opts.clipStart != null) ? Math.max(0, Math.round(toIndex(opts.clipStart))) : 0;
        hiIdx = (opts.clipEnd != null) ? Math.min(frames.length - 1, Math.round(toIndex(opts.clipEnd))) : frames.length - 1;
        if (hiIdx <= loIdx) { loIdx = 0; hiIdx = frames.length - 1; }   // fallback if clip looks invalid
        slider.min = String(loIdx);
        slider.max = String(hiIdx);
        setSpeed(1);
        drawMarkers();
        const startIdx = (opts.start != null) ? Math.round(toIndex(opts.start))
          : (opts.segments && opts.segments.length ? Math.round(toIndex(opts.segments[0][0])) : loIdx);
        setIndex(startIdx);
        preload(index);
      } catch (e) {
        showError(tf("Could not load video: {msg}", { msg: e.message }));
        note.textContent = tf("Manifest expected at {url}", { url: "./Videos/" + opts.dataset + "/" + opts.videoId + "/frames.json" });
      }
    })();

    return { destroy() { destroyed = true; stop(); } };
  }

  // ---------- app state ----------
  let study = null;
  let taskFilter = null;  // when set (?task=TAL), only that task's items are reviewed
  let state = null;       // persisted session state
  let order = [];         // shuffled item indices
  let pos = 0;            // position within order (current item)
  let player = null;
  let itemEnterTime = 0;
  let showWrapup = false;

  function persistTime() {
    if (showWrapup || pos < 0 || pos >= order.length) return;
    const item = study.items[order[pos]];
    if (!item) return;
    const add = Date.now() - itemEnterTime;
    state.times[item.item_id] = (state.times[item.item_id] || 0) + Math.max(0, add);
    itemEnterTime = Date.now();
  }

  function setProgress() {
    const total = order.length;
    const answered = order.filter((idx) => itemComplete(study.items[idx])).length;
    progressWrap.style.display = "flex";
    progressFill.style.width = (total ? (answered / total) * 100 : 0) + "%";
    progressText.textContent = tf("{a} / {b} done", { a: answered, b: total });
  }

  function isSkipped(item) { return !!(state.skipped && state.skipped[item.item_id]); }

  function itemComplete(item) {
    if (isSkipped(item)) return true;   // a skipped item is "resolved", not blocking
    const ans = state.answers[item.item_id] || {};
    return study.dimensions.every((dim) => {
      if (!dimVisible(dim, item) || !dimRequired(dim)) return true;
      const v = ans[dim.id];
      return v != null && String(v).trim() !== "";
    });
  }

  // ---------- screens ----------
  function start() {
    const params = new URLSearchParams(location.search);
    const id = params.get("study");
    taskFilter = params.get("task") || null;
    if (!id) { fatal("No study specified. Append ?study=<id> to the URL."); return; }
    fetch("./studies/" + id + ".json", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then((cfg) => {
        study = cfg;
        // merge optional per-item Chinese translations (question_zh / answer_zh / think_zh / caption_zh)
        return fetch("./studies/zh_items.json", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null)).catch(() => null)
          .then((zh) => {
            mergeItemTranslations(zh);
            if (taskFilter) {
              study.items = (study.items || []).filter((it) => (it.task || it.group || "") === taskFilter);
              if (!study.items.length) { fatal("No items found for task '" + taskFilter + "' in this study."); return; }
            }
            setTitleBar();
            renderIntro();
          });
      })
      .catch((e) => fatal("Could not load ./studies/" + id + ".json — " + e.message));
  }

  function mergeItemTranslations(zh) {
    if (!zh || !study || !zh[study.study_id]) return;
    const m = zh[study.study_id];
    (study.items || []).forEach((it) => {
      const z = m[it.item_id];
      if (z) for (const k in z) { if (it[k] == null) it[k] = z[k]; }
    });
  }

  function fatal(msg) {
    redraw = function () { fatal(msg); };
    clear(root);
    root.appendChild(el("div", { class: "banner warn", text: msg }));
    root.appendChild(el("p", null, el("a", { href: "./index.html", text: tr("← Back to studies") })));
  }

  let introReviewerDraft = "";

  function renderIntro() {
    redraw = renderIntro;
    clear(root);
    progressWrap.style.display = "none";
    const card = el("div", { class: "card narrow" });
    card.appendChild(el("p", { class: "eyebrow", text: studyTypeLabel() }));
    card.appendChild(el("h1", { text: L(study, "title") || study.study_id }));
    card.appendChild(el("div", { class: "prose", html: renderMarkdown(L(study, "intro_md")) }));
    if (L(study, "context_md")) {
      card.appendChild(el("h2", { text: tr("Reference") }));
      card.appendChild(el("div", { class: "prose", html: renderMarkdown(L(study, "context_md")) }));
    }

    let reviewerInput = null;
    if (study.require_reviewer_id) {
      const field = el("div", { style: "margin-top:18px" });
      field.appendChild(el("label", { for: "reviewer", text: tr("Your initials or email (for de-duplication)") }));
      reviewerInput = el("input", { type: "text", id: "reviewer", placeholder: tr("e.g. SG or you@hospital.org"), autocomplete: "off", style: "margin-top:6px;max-width:360px" });
      reviewerInput.value = introReviewerDraft;
      reviewerInput.addEventListener("input", () => { introReviewerDraft = reviewerInput.value; });
      field.appendChild(reviewerInput);
      card.appendChild(field);
    }

    const btn = el("button", { class: "btn btn-primary", text: tr("Begin review"), style: "margin-top:20px" });
    const errLine = el("div", { class: "banner warn", style: "display:none;margin-top:14px" });
    btn.addEventListener("click", () => {
      const reviewer = reviewerInput ? reviewerInput.value.trim() : "anonymous";
      if (study.require_reviewer_id && !reviewer) {
        errLine.style.display = "block"; errLine.textContent = tr("Please enter your initials or email to begin.");
        return;
      }
      beginSession(reviewer);
    });
    card.appendChild(btn);
    card.appendChild(errLine);

    // resume hint if a prior session exists for a typed reviewer (checked on begin)
    root.appendChild(card);
  }

  function studyTypeLabel() {
    return tr(({ criteria: "Study · criteria validation", think: "Study · reasoning validation", caption: "Study · summary validation" })[study.study_type] || "Study");
  }

  function beginSession(reviewer) {
    const existing = loadState(study.study_id, taskFilter, reviewer);
    if (existing && existing.order && existing.order.length === study.items.length) {
      state = existing;
      state.user_agent = navigator.userAgent;
      state.task_group = taskFilter;
    } else {
      const n = study.items.length;
      const seed = study.study_id + "::" + (taskFilter || "") + "::" + reviewer;
      const ord = study.randomize_items ? seededOrder(n, seed) : Array.from({ length: n }, (_, i) => i);
      state = {
        study_id: study.study_id, task_group: taskFilter, reviewer_id: reviewer,
        started_at: new Date().toISOString(),
        user_agent: navigator.userAgent,
        order: ord, answers: {}, times: {}, skipped: {}, edits: {}, answerEdits: {}, wrapup: {}, current: 0,
      };
    }
    if (!state.skipped) state.skipped = {};   // back-compat for resumed sessions
    if (!state.edits) state.edits = {};
    if (!state.answerEdits) state.answerEdits = {};
    order = state.order;
    pos = Math.min(state.current || 0, order.length - 1);
    showWrapup = false;
    saveState(state);
    renderItem();
  }

  function renderItem() {
    redraw = renderItem;
    if (player) { player.destroy(); player = null; }
    clear(root);
    showWrapup = false;
    itemEnterTime = Date.now();
    const item = study.items[order[pos]];
    state.current = pos;

    const card = el("div", { class: "card" });
    const head = el("div", { class: "row", style: "display:flex;align-items:center;gap:10px;margin-bottom:4px" });
    head.appendChild(el("span", { class: "tag", text: tf("Item {n} of {total}", { n: pos + 1, total: order.length }) }));
    if (item.task) head.appendChild(el("span", { class: "tag task", text: taskLabel(item.task) }));
    else if (item.group) head.appendChild(el("span", { class: "tag task", text: item.group }));
    card.appendChild(head);

    if (isSkipped(item)) head.appendChild(el("span", { class: "tag skipped", text: tr("Skipped") }));

    // dimsHost holds the per-item rating questions
    const dimsHost = el("div", { class: "dims" });
    if (isSkipped(item)) {
      dimsHost.appendChild(el("div", { class: "banner info",
        text: tr("You marked this item as skipped — answers below are optional. Answer any question to include it again.") }));
    }
    study.dimensions.forEach((dim) => {
      if (!dimVisible(dim, item)) return;
      dimsHost.appendChild(renderDimension(dim, item));
    });

    if (study.study_type === "criteria") {
      renderCriteriaBody(card, item);
      card.appendChild(dimsHost);
    } else {
      const layout = el("div", { class: "item-layout" });
      const playerCol = el("div", { class: "player-col" });
      const contentCol = el("div", {});
      renderMediaBody(playerCol, contentCol, item);
      const ctx = buildContext(item);   // instruction + per-task L1/L2/L3 template
      if (ctx) contentCol.appendChild(ctx);
      contentCol.appendChild(dimsHost);
      layout.appendChild(playerCol);
      layout.appendChild(contentCol);
      card.appendChild(layout);
    }
    root.appendChild(card);

    root.appendChild(renderFooter());
    setProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderCriteriaBody(card, item) {
    if (item.criterion) {
      card.appendChild(el("div", { class: "qa-block" }, [
        el("div", { class: "qa-label", text: tr("Criterion under review") }),
        el("div", { class: "qa-text", text: L(item, "criterion") }),
      ]));
    }
    if (item.rationale) {
      card.appendChild(el("div", { class: "qa-block" }, [
        el("div", { class: "qa-label", text: tr("Intended rationale") }),
        el("div", { class: "qa-text muted", text: L(item, "rationale") }),
      ]));
    }
  }

  function renderMediaBody(playerCol, contentCol, item) {
    if (item.dataset && item.video_id) {
      player = FramePlayer(playerCol, {
        dataset: item.dataset, videoId: item.video_id,
        start: item.start, end: item.end, segments: item.segments,
        clipStart: item.clip_start, clipEnd: item.clip_end,
      });
    } else {
      playerCol.appendChild(el("div", { class: "no-media", text: tr("No video associated with this item.") }));
    }

    if (item.question) {
      contentCol.appendChild(el("div", { class: "qa-block" }, [
        el("div", { class: "qa-label", text: tr("Question shown to the model") }),
        el("div", { class: "qa-text", text: L(item, "question") }),
      ]));
    }
    if (item.answer != null && item.answer !== "") {
      if (answerEditable(item)) {
        contentCol.appendChild(buildAnswerEditor(item));
      } else {
        contentCol.appendChild(el("div", { class: "qa-block" }, [
          el("div", { class: "qa-label", text: tr("Model's answer") }),
          el("div", { class: "qa-text qa-answer", text: L(item, "answer") }),
        ]));
      }
    }
    if (study.study_type === "caption" && item.caption) {
      contentCol.appendChild(el("div", { class: "qa-block" }, [
        el("div", { class: "qa-label", text: tr("Model's summary") }),
        el("div", { class: "qa-text qa-answer", text: L(item, "caption") }),
      ]));
    }
    if (study.study_type === "think") {
      const t = item.think;
      if (t != null && String(t).trim() !== "") {
        contentCol.appendChild(buildReasoningEditor(item));
      } else {
        contentCol.appendChild(el("div", { class: "qa-block" }, [
          el("div", { class: "qa-label", text: tr("Model's reasoning") }),
          el("div", { class: "no-media", text: tr("No reasoning trace for this item — rate the answer only.") }),
        ]));
      }
    }
  }

  // The model's answer is editable only for these tasks (the answer is free-text there)
  function answerEditable(item) { return item.task === "DVC" || item.task === "VS"; }

  function buildReasoningEditor(item) {
    return buildEditableField(item, "think", state.edits || (state.edits = {}), {
      box: "qa-think", label: "Model's reasoning (<think>) — editable",
      hint: "You can correct this reasoning; your edits are saved with your response.",
    });
  }
  function buildAnswerEditor(item) {
    return buildEditableField(item, "answer", state.answerEdits || (state.answerEdits = {}), {
      box: "qa-answer", label: "Model's answer — editable",
      hint: "You can correct this answer; your edits are saved with your response.",
    });
  }

  // Generic editable field. Pre-filled with the model's text (current language);
  // the reviewer's edits are stored per item in editsMap and saved in the export.
  function buildEditableField(item, field, editsMap, opts) {
    const wrap = el("div", { class: "qa-block" });
    const ta = el("textarea", { class: "qa-text " + opts.box + " qa-think-edit", spellcheck: "false" });
    ta.value = (item.item_id in editsMap) ? editsMap[item.item_id] : (L(item, field) || "");
    ta.addEventListener("input", () => { editsMap[item.item_id] = ta.value; commitDebounced(); });
    const reset = el("a", { class: "reset-link", text: tr("Reset to original"),
      onclick: () => { delete editsMap[item.item_id]; ta.value = L(item, field) || ""; commit(); } });
    wrap.appendChild(el("div", { class: "qa-edit-head" }, [
      el("span", { class: "qa-label", text: tr(opts.label) }), reset,
    ]));
    wrap.appendChild(ta);
    wrap.appendChild(el("div", { class: "edit-hint", text: tr(opts.hint) }));
    return wrap;
  }

  function renderDimension(dim, item) {
    const wrap = el("div", { class: "dim", "data-dim": dim.id });
    const label = el("label", { class: "dim-q" });
    label.appendChild(document.createTextNode(L(dim, "label") || dim.id));
    if (dimRequired(dim)) label.appendChild(el("span", { class: "req-star", text: "*" }));
    else label.appendChild(el("span", { class: "opt-note", text: tr("(optional)") }));
    wrap.appendChild(label);

    const ans = state.answers[item.item_id] || (state.answers[item.item_id] = {});
    const type = dimType(dim);

    if (type === "likert") {
      const scale = (study.scales || {})[dim.scale] || { min: 1, max: 5, labels: {} };
      const group = el("div", { class: "likert" });
      const name = "dim_" + item.item_id + "_" + dim.id;
      for (let v = scale.min; v <= scale.max; v++) {
        const id = name + "_" + v;
        const cap = (scale.labels || {})[String(v)];
        const input = el("input", {
          type: "radio", name, id, value: String(v),
          checked: String(ans[dim.id]) === String(v) ? "checked" : null,
          onchange: () => { ans[dim.id] = v; clearInvalid(wrap); clearSkip(item); commit(); },
        });
        const lab = el("label", { for: id }, [
          el("span", { class: "n", text: String(v) }),
          cap ? el("span", { class: "cap", text: tr(cap) }) : null,
        ]);
        group.appendChild(el("div", { class: "opt" }, [input, lab]));
      }
      wrap.appendChild(group);
      addCommentBox(wrap, dim, ans);
    } else if (type === "select") {
      const sel = el("select", {
        onchange: (e) => { ans[dim.id] = e.target.value; clearInvalid(wrap); clearSkip(item); commit(); },
      });
      sel.appendChild(el("option", { value: "", text: tr("— select —") }));
      (dim.options || []).forEach((opt) => {
        // value stays the canonical English option; only the displayed text is localized
        sel.appendChild(el("option", { value: opt, text: tr(opt), selected: ans[dim.id] === opt ? "selected" : null }));
      });
      wrap.appendChild(sel);
      addCommentBox(wrap, dim, ans);
    } else {
      const ta = el("textarea", {
        placeholder: dim.placeholder ? tr(dim.placeholder) : tr("Type here…"),
        oninput: (e) => { ans[dim.id] = e.target.value; clearInvalid(wrap); commitDebounced(); },
      });
      ta.value = ans[dim.id] || "";
      wrap.appendChild(ta);
    }
    return wrap;
  }

  // Optional free-text note attached to a multiple-choice question (likert / select).
  // Stored alongside the rating as "<dim>__comment" so it flows into JSON + CSV export.
  function addCommentBox(wrap, dim, ans) {
    const key = dim.id + "__comment";
    const ci = el("input", { type: "text", class: "dim-comment",
      placeholder: tr("Add a comment (optional)"),
      oninput: (e) => { ans[key] = e.target.value; commitDebounced(); } });
    ci.value = ans[key] || "";
    wrap.appendChild(ci);
  }

  function clearInvalid(node) { node.classList.remove("invalid"); }

  // Answering a rating un-skips the item; drop the skipped tag/banner without re-rendering.
  function clearSkip(item) {
    if (state.skipped && state.skipped[item.item_id]) {
      delete state.skipped[item.item_id];
      const b = root.querySelector(".dims > .banner"); if (b) b.remove();
      const t = root.querySelector(".tag.skipped"); if (t) t.remove();
    }
  }

  let commitTimer = null;
  function commit() { persistTime(); state.current = pos; saveState(state); setProgress(); }
  function commitDebounced() { clearTimeout(commitTimer); commitTimer = setTimeout(commit, 500); }

  function renderFooter() {
    const foot = el("div", { class: "runner-foot" });
    const inner = el("div", { class: "runner-foot-inner" });
    const prev = el("button", { class: "btn", text: tr("← Previous"), disabled: pos === 0 ? "disabled" : null,
      onclick: () => goTo(pos - 1) });
    const count = el("span", { class: "count", text: tf("Item {n} of {total}", { n: pos + 1, total: order.length }) });
    const skip = el("button", { class: "btn btn-ghost skip-btn", text: tr("Skip this item"),
      title: tr("Skip this item"), onclick: skipItem });
    const next = pos < order.length - 1
      ? el("button", { class: "btn btn-primary", text: tr("Next →"), onclick: () => goTo(pos + 1) })
      : el("button", { class: "btn btn-primary", text: tr("Review & submit →"), onclick: goWrapup });
    inner.appendChild(prev);
    inner.appendChild(count);
    inner.appendChild(el("span", { class: "spacer" }));
    inner.appendChild(skip);
    inner.appendChild(next);
    foot.appendChild(inner);
    return foot;
  }

  function skipItem() {
    const item = study.items[order[pos]];
    state.skipped[item.item_id] = true;
    persistTime(); commit();
    if (pos < order.length - 1) goTo(pos + 1);
    else goWrapup();
  }

  function goTo(p) {
    persistTime();
    commit();
    pos = Math.max(0, Math.min(order.length - 1, p));
    renderItem();
  }

  function goWrapup() {
    persistTime(); commit();
    if (player) { player.destroy(); player = null; }
    showWrapup = true;
    renderWrapup();
  }

  function incompleteItems() {
    const bad = [];
    order.forEach((idx, k) => {
      const item = study.items[idx];
      if (!itemComplete(item)) bad.push({ k, item });
    });
    return bad;
  }

  function renderWrapup() {
    redraw = renderWrapup;
    clear(root);
    window.scrollTo({ top: 0 });
    const card = el("div", { class: "card narrow" });
    card.appendChild(el("p", { class: "eyebrow", text: tr("Almost done") }));
    card.appendChild(el("h1", { text: tr("Review & submit") }));

    const bad = incompleteItems();
    if (bad.length) {
      const b = el("div", { class: "banner warn" });
      b.appendChild(el("div", { text: tf("{n} item(s) still need a required answer:", { n: bad.length }) }));
      const ul = el("ul");
      bad.forEach(({ k, item }) => {
        const txt = item.task
          ? tf("Item {n} ({task})", { n: k + 1, task: taskLabel(item.task) })
          : tf("Item {n}", { n: k + 1 });
        const a = el("a", { text: txt, onclick: () => { showWrapup = false; goTo(k); } });
        ul.appendChild(el("li", null, a));
      });
      b.appendChild(ul);
      card.appendChild(b);
    } else {
      card.appendChild(el("div", { class: "banner info", text: tr("All items have their required answers. Add any final notes below, then submit.") }));
    }

    const nSkipped = order.filter((idx) => isSkipped(study.items[idx])).length;
    if (nSkipped) {
      card.appendChild(el("p", { class: "muted", style: "margin-top:-4px",
        text: tf("{n} item(s) were skipped (recorded as skipped). You can go back to answer any of them.", { n: nSkipped }) }));
    }

    // wrapup free-text (optional)
    if (Array.isArray(study.wrapup) && study.wrapup.length) {
      card.appendChild(el("h2", { text: tr("Final notes") }));
      study.wrapup.forEach((w) => {
        const field = el("div", { style: "margin-bottom:14px" });
        field.appendChild(el("label", { class: "dim-q", for: "wrap_" + w.id }, [
          document.createTextNode(L(w, "label") || w.id),
          el("span", { class: "opt-note", text: tr("(optional)") }),
        ]));
        const ta = el("textarea", { id: "wrap_" + w.id,
          oninput: (e) => { state.wrapup[w.id] = e.target.value; commitDebounced(); } });
        ta.value = (state.wrapup && state.wrapup[w.id]) || "";
        field.appendChild(ta);
        card.appendChild(field);
      });
    }

    const submit = el("button", { class: "btn btn-primary", text: tr("Submit responses"), disabled: bad.length ? "disabled" : null,
      onclick: doSubmit });
    const back = el("button", { class: "btn btn-ghost", text: tr("← Back to items"), onclick: () => { showWrapup = false; goTo(pos); } });
    card.appendChild(el("div", { class: "dl-row" }, [submit, back]));
    root.appendChild(card);
    progressWrap.style.display = "none";
  }

  // ---------- export ----------
  function buildResponse() {
    const seenOrder = {};
    order.forEach((idx, k) => { seenOrder[study.items[idx].item_id] = k + 1; });
    const responses = order.map((idx) => {
      const item = study.items[idx];
      const r = {
        item_id: item.item_id,
        task: item.task || item.group || null,
        seen_order: seenOrder[item.item_id],
        ms_on_item: state.times[item.item_id] || 0,
        skipped: isSkipped(item),
        ratings: state.answers[item.item_id] || {},
      };
      // reasoning edits (only for items that have a <think> trace)
      if (item.think != null && String(item.think).trim() !== "") {
        const editsMap = state.edits || {};
        const edited = (item.item_id in editsMap) ? editsMap[item.item_id] : item.think;
        const changed = (item.item_id in editsMap) && edited !== item.think && edited !== (item.think_zh || null);
        r.reasoning_original = item.think;
        r.reasoning_edited = edited;
        r.reasoning_changed = changed;
      }
      // answer edits (only for tasks whose answer is editable: DVC, VS)
      if (answerEditable(item) && item.answer != null && item.answer !== "") {
        const aem = state.answerEdits || {};
        const aedited = (item.item_id in aem) ? aem[item.item_id] : item.answer;
        const achanged = (item.item_id in aem) && aedited !== item.answer && aedited !== (item.answer_zh || null);
        r.answer_original = item.answer;
        r.answer_edited = aedited;
        r.answer_changed = achanged;
      }
      return r;
    });
    const out = {
      study_id: study.study_id,
      task_group: taskFilter || null,
      reviewer_id: state.reviewer_id,
      started_at: state.started_at,
      submitted_at: new Date().toISOString(),
      user_agent: state.user_agent || navigator.userAgent,
      responses,
    };
    if (Array.isArray(study.wrapup) && study.wrapup.length) out.wrapup = state.wrapup || {};
    return out;
  }

  function csvEscape(v) {
    if (v == null) v = "";
    v = String(v);
    if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  }
  function buildCsv() {
    // one value column per dimension; multiple-choice dims also get a "<id>_comment" column
    const cols = [];
    study.dimensions.forEach((d) => {
      cols.push({ key: d.id, header: d.id });
      const t = dimType(d);
      if (t === "likert" || t === "select") cols.push({ key: d.id + "__comment", header: d.id + "_comment" });
    });
    const header = ["reviewer_id", "item_id", "task", "seen_order", "ms_on_item", "skipped"]
      .concat(cols.map((c) => c.header))
      .concat(["reasoning_changed", "reasoning_edited", "answer_changed", "answer_edited"]);
    const lines = [header.map(csvEscape).join(",")];
    const data = buildResponse();
    data.responses.forEach((r) => {
      const row = [state.reviewer_id, r.item_id, r.task || "", r.seen_order, r.ms_on_item, r.skipped ? "yes" : ""]
        .concat(cols.map((c) => (r.ratings[c.key] != null ? r.ratings[c.key] : "")))
        .concat([
          r.reasoning_changed ? "yes" : "", r.reasoning_edited != null ? r.reasoning_edited : "",
          r.answer_changed ? "yes" : "", r.answer_edited != null ? r.answer_edited : "",
        ]);
      lines.push(row.map(csvEscape).join(","));
    });
    return lines.join("\r\n");
  }

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function safeName(s) { return String(s || "").replace(/[^A-Za-z0-9._-]+/g, "_"); }

  // central collection endpoint: per-study override, else the site-wide default in config.js
  function collectEndpoint() {
    return study.collect_endpoint || (typeof window !== "undefined" && window.GRPOVIDBENCH_COLLECT_ENDPOINT) || null;
  }

  async function doSubmit() {
    persistTime(); commit();
    const data = buildResponse();
    const csvText = buildCsv();
    const stamp = data.submitted_at.replace(/[:]/g, "-");
    const base = "responses_" + safeName(study.study_id) + (taskFilter ? "_" + safeName(taskFilter) : "") + "_" + safeName(state.reviewer_id) + "_" + stamp;
    // always download a local backup
    download(base + ".json", JSON.stringify(data, null, 2), "application/json");
    download(base + ".csv", csvText, "text/csv");

    let postMsg = "";
    const endpoint = collectEndpoint();
    if (endpoint) {
      // Fire-and-forget POST. Apps Script web apps don't return CORS headers, so we use
      // no-cors (opaque response, can't be read) — the request still reaches the server.
      // The local download above is the backup if the network call fails.
      try {
        await fetch(endpoint, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ filename: base, json: data, csv: csvText }),
        });
        postMsg = "Your responses were submitted to the study automatically. The downloaded files are just a backup.";
      } catch (e) {
        postMsg = "(Automatic submission could not be sent — please email the downloaded files.)";
      }
    }
    renderDone(base, postMsg, !!endpoint);
  }

  function renderDone(base, postMsg, autoSent) {
    redraw = function () { renderDone(base, postMsg, autoSent); };
    clear(root);
    window.scrollTo({ top: 0 });
    const card = el("div", { class: "card narrow" });
    card.appendChild(el("div", { class: "done-icon", text: "✓" }));
    card.appendChild(el("h1", { text: tr("Thank you — review complete") }));
    card.appendChild(el("p", { class: "lead", text: tr(autoSent
      ? "Your responses were submitted automatically. A JSON and CSV copy was also downloaded to your computer as a backup — no need to email anything unless asked."
      : "Your responses have been downloaded as a JSON and a CSV file. Please send us the file (whichever your coordinator requested).") }));
    if (postMsg) card.appendChild(el("div", { class: "banner info", text: tr(postMsg) }));
    card.appendChild(el("p", { class: "muted", text: tf("Files: {json} · {csv}", { json: base + ".json", csv: base + ".csv" }) }));

    const dl = el("div", { class: "dl-row" }, [
      el("button", { class: "btn", text: tr("Download JSON again"),
        onclick: () => download(base + ".json", JSON.stringify(buildResponse(), null, 2), "application/json") }),
      el("button", { class: "btn", text: tr("Download CSV again"),
        onclick: () => download(base + ".csv", buildCsv(), "text/csv") }),
    ]);
    card.appendChild(dl);
    card.appendChild(el("p", null, el("a", { href: "./index.html", text: tr("← Back to all studies") })));
    root.appendChild(card);
    progressWrap.style.display = "none";
  }

  function setTitleBar() {
    if (!study) return;
    const base = L(study, "title") || study.study_id;
    titleBar.textContent = taskFilter ? (I.taskName(taskFilter) + " · " + base) : base;
  }

  // ---------- lifecycle ----------
  window.addEventListener("beforeunload", () => { try { persistTime(); if (state) saveState(state); } catch (e) {} });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { persistTime(); if (state) saveState(state); } });

  // language toggle: mount in the top bar, re-render the current screen on switch
  I.mountToggle(document.querySelector(".topbar-inner"));
  I.onChange(function () { setTitleBar(); redraw(); });

  start();
})();
