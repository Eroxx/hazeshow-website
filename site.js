// The show plays itself. The hero and TV videos load and loop; each room's video plays while
// it's on screen and pauses when it isn't. With Reduce Motion on, every video shows its poster
// with a play control instead.
(function () {
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var play = function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); };

  // Small screens get the lighter home page film. On Data Saver or a very slow connection nothing plays
  // by itself: the poster stays, with controls. The film starts after the page has loaded, so its
  // bytes never compete with the first paint.
  var net = navigator.connection || {};
  var saver = net.saveData || /(^|-)2g$/.test(net.effectiveType || "");
  var small = window.innerWidth < 900 || window.innerWidth * (window.devicePixelRatio || 1) <= 1400;
  // Each film also comes in HEVC and AV1, about a third smaller; the H.264 original plays anywhere.
  // (Not the small hero: already squeezed so hard that the new formats save almost nothing.)
  var probe = document.createElement("video");
  var kind = probe.canPlayType('video/mp4; codecs="hvc1.1.6.L120.90"') ? ".hevc" : probe.canPlayType('video/mp4; codecs="av01.0.08M.08"') ? ".av1" : "";
  var film = function (name) { return name + kind + ".mp4"; };
  var startHero = function () {
    document.querySelectorAll("video[data-src]").forEach(function (v) {
      v.muted = true;
      v.src = small ? v.getAttribute("data-src") + "-sm.mp4" : film(v.getAttribute("data-src"));
      if (still || saver) { v.removeAttribute("autoplay"); v.controls = true; return; }
      play(v);
    });
  };
  if (document.readyState === "complete") startHero(); else window.addEventListener("load", startHero);

  // Everything below the first screen waits: a poster loads as its video comes near, the video
  // itself only once it is on screen.
  var inline = document.querySelectorAll("video[data-inline]");
  var poster = function (v) { var p = v.getAttribute("data-poster"); if (p) { v.poster = p; v.removeAttribute("data-poster"); } };
  var load = function (v) { if (!v.src) v.src = film("video/" + v.getAttribute("data-inline")); };
  if (!("IntersectionObserver" in window)) { inline.forEach(function (v) { poster(v); load(v); v.controls = true; }); return; }
  var near = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { poster(e.target); near.unobserve(e.target); } });
  }, { rootMargin: "800px 0px" });
  inline.forEach(function (v) { near.observe(v); });
  if (still || saver) { inline.forEach(function (v) { v.controls = true; load(v); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        load(v);
        if (!v.hasAttribute("data-sound")) v.muted = true;
        play(v);
      } else { v.pause(); }
    });
  }, { threshold: 0.35 });
  inline.forEach(function (v) { io.observe(v); });

  // The moving rows of stills rest while they're off screen.
  var reels = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle("resting", !e.isIntersecting); });
  });
  document.querySelectorAll(".reels").forEach(function (r) { reels.observe(r); });
})();

// Sound (a friend's note, 2026-10-22: the films showed the lights but not that Hazeshow hears
// music). Every film plays to "First Light", the song that comes with Hazeshow, which we own, so
// it can be heard here. Browsers start videos muted: each has a Sound button. One plays aloud at a
// time; turning it on starts the film from its first beat.
var setSoundOff = function () {};
(function () {
  var ICON_OFF = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor"/><path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" stroke-width="1.5"/></svg>';
  var ICON_ON = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  var buttons = [];
  var show = function (b, on) {
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.setAttribute("aria-label", on ? b.getAttribute("data-on") + ", turn it off" : "Turn on the sound");
    b.innerHTML = (on ? ICON_ON : ICON_OFF) + "<span>" + (on ? b.getAttribute("data-on") : b.getAttribute("data-label")) + "</span>";
  };
  var off = function (v) {
    v.muted = true; v.removeAttribute("data-sound");
    buttons.forEach(function (b) { if (b._video === v) show(b, false); });
  };
  setSoundOff = off;
  var on = function (v) {
    document.querySelectorAll("video[data-sound]").forEach(off);
    v.setAttribute("data-sound", "");
    v.muted = false; v.currentTime = 0;
    var p = v.play(); if (p && p.catch) p.catch(function () {});
    buttons.forEach(function (b) { if (b._video === v) show(b, true); });
  };
  var wire = function (v, b) {
    b._video = v;
    show(b, false);
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      if (v.hasAttribute("data-sound")) off(v); else on(v);
    });
    buttons.push(b);
  };
  var add = function (v, host, label, onLabel) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "sound";
    b.setAttribute("data-label", label); b.setAttribute("data-on", onLabel);
    host.appendChild(b);
    wire(v, b);
  };
  // The hero's button is in the page itself, with the words, so nothing shifts when it wakes up.
  var hero = document.querySelector(".hero-video"), heroButton = document.querySelector(".sound-hero");
  if (hero && heroButton) wire(hero, heroButton);
  window.addEventListener("load", function () {
    document.querySelectorAll(".room video, .tv-video, .strip video").forEach(function (v) {
      add(v, v.closest(".zoom") || v.parentNode, "Sound", "Sound on");
      // Scrolled away (paused): its sound goes too.
      v.addEventListener("pause", function () { if (v.hasAttribute("data-sound") && !document.documentElement.classList.contains("viewing")) off(v); });
    });
  });
})();

// Every picture and video opens larger: tap or click it (or its expand button), and the
// viewer fills the screen. A video plays there with its controls; Esc, the close button or a
// tap outside closes it.
(function () {
  var box = document.createElement("div");
  box.className = "viewer"; box.hidden = true;
  box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
  box.innerHTML = '<button class="viewer-close" type="button" aria-label="Close">&times;</button><div class="viewer-stage"></div><p class="viewer-caption"></p>';
  document.body.appendChild(box);
  var stage = box.querySelector(".viewer-stage"), caption = box.querySelector(".viewer-caption");
  var opener = null;

  var src = function (v) {
    if (v.getAttribute("data-src")) return v.currentSrc || v.getAttribute("data-src") + ".mp4";
    if (v.getAttribute("data-inline")) return v.currentSrc || "video/" + v.getAttribute("data-inline") + ".mp4";
    return v.currentSrc || v.src;
  };

  var open = function (el) {
    opener = el;
    stage.innerHTML = "";
    var big;
    if (el.tagName === "VIDEO") {
      big = document.createElement("video");
      big.src = src(el); big.poster = el.poster || el.getAttribute("data-poster") || "";
      big.muted = !el.hasAttribute("data-sound"); big.loop = true; big.controls = true; big.playsInline = true; big.autoplay = true;
      big.setAttribute("playsinline", "");
      if (el.currentTime) big.currentTime = el.currentTime;
      el.pause();
      if (el.hasAttribute("data-sound")) setSoundOff(el);
    } else {
      big = document.createElement("img");
      big.src = el.getAttribute("data-full") || el.currentSrc || el.src; big.alt = el.alt;
    }
    stage.appendChild(big);
    var fig = el.closest("figure"), room = el.closest(".room");
    caption.textContent = fig && fig.querySelector("figcaption") ? fig.querySelector("figcaption").textContent
      : room && room.querySelector("h2") ? room.querySelector("h2").textContent
      : el.getAttribute("aria-label") || el.alt || "";
    box.hidden = false;
    document.documentElement.classList.add("viewing");
    if (big.tagName === "VIDEO") { var p = big.play(); if (p && p.catch) p.catch(function () {}); }
    box.querySelector(".viewer-close").focus();
  };

  var close = function () {
    if (box.hidden) return;
    stage.innerHTML = "";
    box.hidden = true;
    document.documentElement.classList.remove("viewing");
    if (opener && opener.tagName === "VIDEO" && opener.hasAttribute("autoplay")) { var p = opener.play(); if (p && p.catch) p.catch(function () {}); }
    if (opener) { var b = opener.parentNode.querySelector(".expand") || document.querySelector(".hero .expand"); if (b) b.focus(); }
  };

  box.addEventListener("click", function (e) { if (e.target === box || e.target === stage || e.target.classList.contains("viewer-close")) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  var button = function (el, label) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "expand";
    b.setAttribute("aria-label", label);
    b.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    b.addEventListener("click", function (e) { e.stopPropagation(); open(el); });
    return b;
  };

  // The hero film sits behind its words: its button opens it, and so does a tap on the picture.
  var hero = document.querySelector(".hero-video");
  if (hero) {
    var hb = button(hero, "Watch the film full size");
    hb.classList.add("expand-hero");
    hero.parentNode.appendChild(hb);
    hero.parentNode.addEventListener("click", function (e) { if (!e.target.closest("a, button")) open(hero); });
  }

  document.querySelectorAll(".room video, .tv-video, .strip video, .strip img, .wall video").forEach(function (el) {
    var wrap = document.createElement("span");
    wrap.className = "zoom";
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    wrap.appendChild(button(el, el.tagName === "VIDEO" ? "Watch full size" : "See full size"));
    el.addEventListener("click", function () { open(el); });
  });
  // The montage's stills open the same way, by a click (no button on each moving tile).
  document.querySelectorAll(".reel img").forEach(function (el) {
    el.addEventListener("click", function () { open(el); });
  });
})();
