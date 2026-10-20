// The show plays itself. The hero and TV videos load and loop; each room's video plays while
// it's on screen and pauses when it isn't. With Reduce Motion on, every video shows its poster
// with a play control instead.
(function () {
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var play = function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); };

  document.querySelectorAll("video[data-src]").forEach(function (v) {
    v.muted = true;
    v.src = v.getAttribute("data-src") + ".mp4";
    if (still) { v.removeAttribute("autoplay"); v.controls = true; return; }
    play(v);
  });

  var inline = document.querySelectorAll("video[data-inline]");
  if (still || !("IntersectionObserver" in window)) {
    inline.forEach(function (v) { v.src = "video/" + v.getAttribute("data-inline") + ".mp4"; v.controls = still; });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) {
        if (!v.src) v.src = "video/" + v.getAttribute("data-inline") + ".mp4";
        v.muted = true; play(v);
      } else { v.pause(); }
    });
  }, { threshold: 0.35 });
  inline.forEach(function (v) { io.observe(v); });
})();
