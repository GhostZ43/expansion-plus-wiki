(function () {
  var root = document.documentElement;

  // Light / dark (remembered).
  var themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("ep-theme", next); } catch (e) {}
  });

  // Mobile menu.
  document.querySelectorAll("[data-menu]").forEach(function (el) {
    el.addEventListener("click", function () { document.body.classList.toggle("menu-open"); });
  });

  // "On this page": highlight the section in view.
  var links = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  var heads = links.map(function (a) { return document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1))); });
  function spy() {
    var cur = -1;
    for (var i = 0; i < heads.length; i++) if (heads[i] && heads[i].getBoundingClientRect().top < 120) cur = i;
    links.forEach(function (a, i) { a.classList.toggle("on", i === cur); });
  }
  if (links.length) { window.addEventListener("scroll", spy, { passive: true }); spy(); }

  // Search.
  var input = document.getElementById("q"), box = document.getElementById("results");
  if (!input || !box) return;
  var data = null, sel = -1;
  function load(cb) {
    if (data) return cb();
    fetch("search.json").then(function (r) { return r.json(); }).then(function (d) { data = d; cb(); })
      .catch(function () { box.innerHTML = '<div class="none">Search needs the site to be online.</div>'; box.classList.add("open"); });
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mark(s, words) {
    var out = esc(s);
    words.forEach(function (w) { if (w) out = out.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>"); });
    return out;
  }
  function snippet(text, words) {
    var low = text.toLowerCase(), at = -1;
    for (var i = 0; i < words.length && at < 0; i++) at = low.indexOf(words[i]);
    if (at < 0) return text.slice(0, 110);
    var start = Math.max(0, at - 40);
    return (start ? "…" : "") + text.slice(start, start + 120) + "…";
  }
  function run() {
    var q = input.value.trim().toLowerCase();
    sel = -1;
    if (q.length < 2) { box.classList.remove("open"); box.innerHTML = ""; return; }
    var words = q.split(/\s+/);
    var hits = [];
    data.forEach(function (e) {
      var t = e.t.toLowerCase(), x = e.x.toLowerCase(), p = (e.p || "").toLowerCase(), score = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (t.indexOf(w) >= 0) score += t.indexOf(w) === 0 ? 12 : 8;
        else if (p.indexOf(w) >= 0) score += 3;
        else if (x.indexOf(w) >= 0) score += 2;
        else { score = 0; break; }
      }
      if (score) hits.push({ e: e, s: score + (e.p ? 0 : 2) });
    });
    hits.sort(function (a, b) { return b.s - a.s; });
    hits = hits.slice(0, 12);
    if (!hits.length) { box.innerHTML = '<div class="none">No results for "' + esc(q) + '"</div>'; box.classList.add("open"); return; }
    box.innerHTML = hits.map(function (h) {
      var e = h.e;
      return '<a href="' + e.u + '"><span class="r-title">' + mark(e.t, words) + "</span>" +
        (e.p ? '<span class="r-page">' + esc(e.p) + "</span>" : '<span class="r-page">' + esc(e.g) + "</span>") +
        '<span class="r-text">' + mark(snippet(e.x, words), words) + "</span></a>";
    }).join("");
    box.classList.add("open");
  }
  input.addEventListener("input", function () { load(run); });
  input.addEventListener("focus", function () { load(function () {}); if (input.value) load(run); });
  input.addEventListener("keydown", function (ev) {
    var items = box.querySelectorAll("a");
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      if (!items.length) return;
      sel = (sel + (ev.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach(function (a, i) { a.classList.toggle("sel", i === sel); });
      items[sel].scrollIntoView({ block: "nearest" });
    } else if (ev.key === "Enter") {
      var go = items[sel >= 0 ? sel : 0];
      if (go) location.href = go.getAttribute("href");
    } else if (ev.key === "Escape") {
      box.classList.remove("open"); input.blur();
    }
  });
  document.addEventListener("click", function (ev) { if (!ev.target.closest(".search")) box.classList.remove("open"); });
  document.addEventListener("keydown", function (ev) {
    if ((ev.key === "k" && (ev.ctrlKey || ev.metaKey)) || (ev.key === "/" && document.activeElement !== input)) {
      ev.preventDefault(); input.focus(); input.select();
    }
  });
})();
