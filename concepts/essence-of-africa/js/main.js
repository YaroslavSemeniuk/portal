/* Essence of Africa — GSAP animations */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var header = document.querySelector(".site-header");
  var navToggle = document.querySelector(".nav-toggle");

  /* ── mobile nav ── */
  navToggle.addEventListener("click", function () {
    var open = header.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    a.addEventListener("click", function () {
      header.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });

  if (typeof gsap === "undefined") {
    // CDN unavailable — show everything statically
    document.querySelectorAll(".reveal, .reveal-img").forEach(function (el) {
      el.style.opacity = 1;
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if (reduceMotion) {
    gsap.set(".reveal, .reveal-img", { opacity: 1 });
    return;
  }

  /* ── header background on scroll ── */
  ScrollTrigger.create({
    start: 60,
    onUpdate: function (self) {
      header.classList.toggle("scrolled", self.scroll() > 60);
    }
  });

  /* ── hero load-in ── */
  gsap.timeline({ defaults: { ease: "power3.out" } })
    .from(".hero-img", { scale: 1.08, duration: 2.2, ease: "power2.out" }, 0)
    .from(".hero-kicker", { y: 24, opacity: 0, duration: 0.9 }, 0.35)
    .from(".hero-title", { y: 50, opacity: 0, duration: 1.1 }, 0.5)
    .from(".hero-sub", { y: 30, opacity: 0, duration: 0.9 }, 0.75)
    .from(".hero-actions .btn", { y: 24, opacity: 0, duration: 0.7, stagger: 0.12 }, 0.95)
    .from(".hero-scroll", { opacity: 0, duration: 0.8 }, 1.3)
    .from(".nav", { y: -24, opacity: 0, duration: 0.8 }, 0.2);

  /* ── hero parallax ── */
  gsap.to(".hero-img", {
    yPercent: 12,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });

  /* ── generic reveals ── */
  gsap.utils.toArray(".reveal").forEach(function (el) {
    gsap.fromTo(el,
      { y: 36, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 86%" }
      });
  });

  gsap.utils.toArray(".reveal-img").forEach(function (el) {
    gsap.fromTo(el,
      { y: 48, opacity: 0, scale: 0.98 },
      {
        y: 0, opacity: 1, scale: 1, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
  });

  /* ── parallax on full-bleed images ── */
  gsap.utils.toArray(".parallax-frame .parallax-img").forEach(function (img) {
    gsap.fromTo(img,
      { yPercent: -9 },
      {
        yPercent: 9, ease: "none",
        scrollTrigger: { trigger: img.closest(".parallax-frame, .final"), start: "top bottom", end: "bottom top", scrub: true }
      });
  });

  /* ── era strip: horizontal scrub (desktop) ── */
  var eraTrack = document.querySelector(".era-track");
  if (eraTrack && window.innerWidth >= 769) {
    var eraOverflow = function () { return Math.max(0, eraTrack.scrollWidth - window.innerWidth); };
    gsap.to(eraTrack, {
      x: function () { return -eraOverflow(); },
      ease: "none",
      scrollTrigger: {
        trigger: "#era-strip",
        start: "top 75%",
        end: "bottom 20%",
        scrub: 0.6,
        invalidateOnRefresh: true
      }
    });
  }

  /* ── day/night: pinned horizontal scroll (desktop) ── */
  var dnTrack = document.querySelector(".daynight-track");
  if (dnTrack && window.innerWidth >= 769) {
    var dnOverflow = function () { return Math.max(0, dnTrack.scrollWidth - window.innerWidth); };
    gsap.to(dnTrack, {
      x: function () { return -dnOverflow(); },
      ease: "none",
      scrollTrigger: {
        trigger: ".daynight-section",
        start: "top top",
        end: function () { return "+=" + dnOverflow(); },
        pin: true,
        scrub: 0.7,
        invalidateOnRefresh: true
      }
    });
  } else if (dnTrack) {
    document.querySelector(".daynight").style.overflowX = "auto";
  }

  /* ── chart bars ── */
  gsap.from(".chart .bar", {
    scaleY: 0,
    duration: 1,
    ease: "power3.out",
    stagger: 0.08,
    scrollTrigger: { trigger: ".chart-bars", start: "top 85%" }
  });

  /* ── stat counters ── */
  gsap.utils.toArray("[data-count]").forEach(function (el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.6,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
      onUpdate: function () {
        var n = decimals ? obj.v.toFixed(decimals) : Math.round(obj.v).toLocaleString("en-US");
        el.textContent = prefix + n + suffix;
      }
    });
  });

  /* ── correct deep-link position after pin spacers change layout ── */
  if (window.location.hash) {
    var hashTarget = document.querySelector(window.location.hash);
    if (hashTarget) {
      ScrollTrigger.refresh();
      window.scrollTo(0, hashTarget.getBoundingClientRect().top + window.scrollY - 70);
    }
  }

  /* ── smooth-anchor offset for fixed header ── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });
})();
