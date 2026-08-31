document.body.classList.add("js-enabled");

const revealElements = document.querySelectorAll(".reveal");

function showAllRevealElements() {
  revealElements.forEach(element => {
    element.classList.add("visible");
  });
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  revealElements.forEach(element => {
    revealObserver.observe(element);
  });
} else {
  showAllRevealElements();
}

window.addEventListener("load", () => {
  setTimeout(showAllRevealElements, 800);
});

const navbar = document.querySelector(".navbar");
let navbarTicking = false;

function updateNavbar() {
  if (!navbar) return;

  // Use a continuous 0→1 progress value so the navbar gently reorganizes
  // as the page moves instead of snapping between two layouts.
  const progress = Math.min(1, Math.max(0, window.scrollY / 420));
  const shift = progress * 76;
  const scale = 1 - progress * 0.075;

  navbar.style.setProperty("--nav-progress", progress.toFixed(3));
  navbar.style.setProperty("--nav-shift", `${shift.toFixed(1)}px`);
  navbar.style.setProperty("--nav-scale", scale.toFixed(3));
  navbar.classList.toggle("is-scrolling", progress > 0.04);
}

window.addEventListener("scroll", () => {
  if (navbarTicking) return;
  navbarTicking = true;
  requestAnimationFrame(() => {
    updateNavbar();
    navbarTicking = false;
  });
}, { passive: true });

window.addEventListener("resize", updateNavbar, { passive: true });
updateNavbar();

const pageGlow = document.querySelector(".page-glow");

if (pageGlow) {
  window.addEventListener("pointermove", event => {
    pageGlow.style.left = `${event.clientX}px`;
    pageGlow.style.top = `${event.clientY}px`;
  });
}

const tiltCards = document.querySelectorAll(".tilt-card");

tiltCards.forEach(card => {
  card.addEventListener("pointermove", event => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const rotateY = ((x / rect.width) - 0.5) * 8;
    const rotateX = ((y / rect.height) - 0.5) * -8;

    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
});

const navLinks = [...document.querySelectorAll(".nav-links a[href^='#']")];
const navIndicator = document.querySelector(".nav-active-line");
const navSectionIds = navLinks.map(link => link.getAttribute("href").slice(1));
const navSections = navSectionIds
  .map(id => document.getElementById(id))
  .filter(Boolean);

// The nav menu lists links in a different order than the sections actually
// appear on the page, so anything that needs "which section is last on the
// page" has to sort by real position rather than trust the menu order.
const navSectionsByPosition = [...navSections].sort(
  (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
);
const lastPageSection = navSectionsByPosition[navSectionsByPosition.length - 1];

let activeNavLink = document.querySelector(".nav-links a.active") || navLinks[0];
let navScrollLock = false;
let navScrollTarget = null;

function positionNavIndicator() {
  if (!navIndicator || !activeNavLink) return;

  const linksBox = activeNavLink.parentElement.getBoundingClientRect();
  const linkBox = activeNavLink.getBoundingClientRect();
  const width = Math.max(24, Math.min(32, linkBox.width * 0.55));
  const x = linkBox.left - linksBox.left + (linkBox.width - width) / 2;

  navIndicator.style.width = `${width}px`;
  navIndicator.style.transform = `translateX(${x}px)`;
}

function setActiveNav(link, force = false) {
  if (!link) return;

  if (!force && activeNavLink === link) {
    positionNavIndicator();
    return;
  }

  navLinks.forEach(item => item.classList.toggle("active", item === link));
  activeNavLink = link;
  // Wait one frame so the browser has the final link geometry before
  // calculating the blue line position.
  requestAnimationFrame(positionNavIndicator);
}

function getNavOffset() {
  return (navbar?.getBoundingClientRect().height || 0) + 26;
}

navLinks.forEach(link => {
  link.addEventListener("click", event => {
    const id = link.getAttribute("href")?.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;

    event.preventDefault();
    setActiveNav(link, true);

    navScrollLock = true;
    navScrollTarget = target;

    const top = Math.max(
      0,
      target.getBoundingClientRect().top + window.scrollY - getNavOffset()
    );

    history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top, behavior: "smooth" });
  });
});

function updateActiveFromScroll() {
  if (!navSections.length) return;

  if (navScrollLock && navScrollTarget) {
    const targetTop = navScrollTarget.getBoundingClientRect().top;
    if (Math.abs(targetTop - getNavOffset()) < 22) {
      navScrollLock = false;
      navScrollTarget = null;
    } else {
      return;
    }
  }

  /*
   * Use viewport coordinates instead of offsetTop.
   * This remains correct when the navbar changes between compact/full
   * states and prevents the active tab from getting stuck.
   */
  const marker = getNavOffset() + Math.min(120, window.innerHeight * 0.18);
  let current = null;
  let currentTop = -Infinity;

  for (const section of navSections) {
    const top = section.getBoundingClientRect().top;
    // Pick the section whose top is closest to (but still above) the
    // marker, based on actual position on the page — not the order the
    // links happen to appear in the nav menu, since those don't match.
    if (top <= marker && top > currentTop) {
      currentTop = top;
      current = section;
    }
  }

  // If the user is above the first section marker, keep Home highlighted.
  if (!current) current = document.getElementById("home");

  // Near the bottom of the page the last section may never reach the
  // marker line (there's no more room to scroll past it), so force it
  // active once the user has essentially reached the end of the page.
  const nearBottom =
    Math.ceil(window.scrollY + window.innerHeight) >=
    document.documentElement.scrollHeight - 4;
  if (nearBottom && lastPageSection) current = lastPageSection;

  const link = navLinks.find(
    item => item.getAttribute("href") === `#${current?.id}`
  );

  if (link) setActiveNav(link);
}

let scrollSpyTicking = false;
window.addEventListener("scroll", () => {
  if (scrollSpyTicking) return;

  scrollSpyTicking = true;
  requestAnimationFrame(() => {
    updateNavbar();
    updateActiveFromScroll();
    positionNavIndicator();
    scrollSpyTicking = false;
  });
}, { passive: true });

window.addEventListener("resize", () => {
  positionNavIndicator();
  updateActiveFromScroll();
}, { passive: true });

window.addEventListener("load", () => {
  requestAnimationFrame(() => {
    setActiveNav(activeNavLink, true);
    updateActiveFromScroll();
    positionNavIndicator();
  });
});

setActiveNav(activeNavLink, true);
updateActiveFromScroll();

// Showcase: keep the main section compact with a looping ribbon, and reveal
// the full categorized gallery only when the visitor asks for more.
(() => {
  const expanded = document.getElementById("showcase-expanded");
  const track = document.getElementById("showcase-track");
  const moreButton = document.getElementById("showcase-more");
  const collapseButton = document.getElementById("showcase-collapse");
  if (!expanded || !track || !moreButton) return;

  const sourceCards = [...expanded.querySelectorAll(".showcase-grid .showcase-card")];
  if (!sourceCards.length) return;

  // Duplicate the set once so the CSS animation can loop seamlessly.
  const firstSet = sourceCards.map(card => card.cloneNode(true));
  const secondSet = sourceCards.map(card => card.cloneNode(true));
  [...firstSet, ...secondSet].forEach(card => {
    card.setAttribute("tabindex", "0");
    track.appendChild(card);
  });

  function setExpanded(open) {
    expanded.hidden = !open;
    moreButton.setAttribute("aria-expanded", String(open));
    moreButton.querySelector("span:first-child").textContent = open ? "Hide Categories" : "View More";
    if (open) {
      expanded.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  moreButton.addEventListener("click", () => setExpanded(!moreButton.getAttribute("aria-expanded") || moreButton.getAttribute("aria-expanded") === "false"));
  collapseButton?.addEventListener("click", () => setExpanded(false));

  const tabs = expanded.querySelectorAll(".showcase-tab");
  const cards = expanded.querySelectorAll(".showcase-grid .showcase-card");

  function applyFilter(category) {
    cards.forEach(card => {
      const matches = category === "all" || card.dataset.category === category;
      card.classList.toggle("is-hidden", !matches);
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(item => {
        item.classList.toggle("active", item === tab);
        item.setAttribute("aria-selected", item === tab ? "true" : "false");
      });
      applyFilter(tab.dataset.category);
    });
  });
})();

// Showcase lightbox: clicking any showcase tile opens the selected image
// in a large, focused preview. Escape and the backdrop close it.
(() => {
  const cards = document.querySelectorAll(".showcase-card");
  if (!cards.length) return;

  const modal = document.createElement("div");
  modal.className = "showcase-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Showcase preview");
  modal.innerHTML = `
    <button class="showcase-modal-backdrop" type="button" aria-label="Close preview"></button>
    <div class="showcase-modal-content" role="document">
      <button class="showcase-modal-close" type="button" aria-label="Close preview">×</button>
      <img class="showcase-modal-image" src="" alt="">
      <h3 class="showcase-modal-title"></h3>
    </div>
  `;
  document.body.appendChild(modal);

  const image = modal.querySelector(".showcase-modal-image");
  const title = modal.querySelector(".showcase-modal-title");
  const closeButtons = modal.querySelectorAll(".showcase-modal-close, .showcase-modal-backdrop");
  let lastTrigger = null;

  function close() {
    modal.classList.remove("open");
    document.body.classList.remove("showcase-open");
    image.removeAttribute("src");
    if (lastTrigger) lastTrigger.focus();
  }

  function open(card) {
    const source = card.dataset.showcaseImage || card.querySelector("img")?.src;
    if (!source) return;

    lastTrigger = card;
    image.src = source;
    image.alt = card.querySelector("img")?.alt || card.dataset.showcaseTitle || "Showcase preview";
    title.textContent = card.dataset.showcaseTitle || "Showcase";
    modal.classList.add("open");
    document.body.classList.add("showcase-open");
    requestAnimationFrame(() => modal.querySelector(".showcase-modal-close")?.focus());
  }

  cards.forEach(card => card.addEventListener("click", () => open(card)));
  closeButtons.forEach(button => button.addEventListener("click", close));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal.classList.contains("open")) close();
  });
})();

// Subtle, minimal constellation field behind the portfolio.
(() => {
  const canvas = document.getElementById("constellation-bg");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let points = [];
  let mouse = { x: -9999, y: -9999 };
  let raf = 0;

  const settings = {
    density: 0.000055,
    maxPoints: 115,
    linkDistance: 145,
    speed: reduceMotion ? 0 : 0.075,
    mouseRadius: 165,
    hoverRadius: 135
  };
  const linkDistanceSq = settings.linkDistance * settings.linkDistance;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.min(settings.maxPoints, Math.max(42, Math.floor(width * height * settings.density)));
    points = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * settings.speed,
      vy: (Math.random() - 0.5) * settings.speed,
      r: Math.random() * 1.15 + 0.35,
      phase: Math.random() * Math.PI * 2
    }));
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    const t = time * 0.001;

    for (const p of points) {
      if (!reduceMotion) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20 || p.x > width + 20) p.vx *= -1;
        if (p.y < -20 || p.y > height + 20) p.vy *= -1;
      }

      const distanceToMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      const hover = Math.max(0, 1 - distanceToMouse / settings.hoverRadius);
      const hoverPulse = hover * (0.5 + Math.sin(t * 2.2 + p.phase) * 0.5);
      const pulse = 0.55 + Math.sin(t * 0.8 + p.phase) * 0.14 + hover * 0.18;
      const radius = p.r + hoverPulse * 1.15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(215, 244, 250, ${Math.min(0.95, pulse + hover * 0.18)})`;
      ctx.fill();

      if (hover > 0.04) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 3 + hover * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${hover * 0.055})`;
        ctx.fill();
      }
    }

    if (mouse.x > -1000 && !reduceMotion) {
      const haloPulse = 0.5 + Math.sin(t * 2.1) * 0.5;
      const halo = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, settings.mouseRadius);
      halo.addColorStop(0, `rgba(34, 211, 238, ${0.018 + haloPulse * 0.012})`);
      halo.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, settings.mouseRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > linkDistanceSq) continue;
        const dist = Math.sqrt(distSq);

        let alpha = (1 - dist / settings.linkDistance) * 0.20;
        const mouseA = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        const mouseB = Math.hypot(b.x - mouse.x, b.y - mouse.y);
        const hoverA = Math.max(0, 1 - mouseA / settings.mouseRadius);
        const hoverB = Math.max(0, 1 - mouseB / settings.mouseRadius);
        alpha += Math.max(hoverA, hoverB) * 0.18;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(125, 215, 232, ${Math.min(alpha, 0.38)})`;
        ctx.lineWidth = 0.55;
        ctx.stroke();
      }
    }

    if (!reduceMotion) raf = requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", event => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  }, { passive: true });
  window.addEventListener("pointerleave", () => {
    mouse.x = -9999;
    mouse.y = -9999;
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      return;
    }
    if (!reduceMotion && !raf) raf = requestAnimationFrame(draw);
  }, { passive: true });

  resize();
  if (reduceMotion) draw(0);
  else raf = requestAnimationFrame(draw);
})();

// Quiet ambient background music. Browsers block autoplay until the first
// user gesture, so the site tries to start softly and falls back to the
// first interaction. The visible control always lets the visitor pause it.
(() => {
  const audio = document.getElementById("ambient-audio");
  const toggle = document.getElementById("music-toggle");
  if (!audio || !toggle) return;

  audio.volume = 0.10;

  const sync = () => {
    const playing = !audio.paused;
    toggle.classList.toggle("is-playing", playing);
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.setAttribute("aria-label", playing ? "Pause background music" : "Play background music");
  };

  const start = async () => {
    try {
      await audio.play();
      sync();
    } catch (_) {
      sync();
    }
  };

  toggle.addEventListener("click", async () => {
    if (audio.paused) await start();
    else { audio.pause(); sync(); }
  });

  ["pointerdown", "keydown"].forEach(type => {
    document.addEventListener(type, () => {
      if (audio.paused && !audio.dataset.dismissed) start();
    }, { once: true, passive: true });
  });

  audio.addEventListener("play", sync);
  audio.addEventListener("pause", sync);
  start();
})();
