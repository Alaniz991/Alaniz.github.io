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
let navbarCompact = false;
let navbarTicking = false;

function updateNavbar() {
  if (!navbar) return;

  // Fixed positioning keeps the navbar attached to the viewport, so changing
  // its size can never affect scroll position or make it flicker/disappear.
  const shouldCompact = window.scrollY > 90;
  if (shouldCompact !== navbarCompact) {
    navbarCompact = shouldCompact;
    navbar.classList.toggle("navbar-compact", navbarCompact);
  }
}

window.addEventListener("scroll", () => {
  if (navbarTicking) return;
  navbarTicking = true;
  requestAnimationFrame(() => {
    updateNavbar();
    navbarTicking = false;
  });
}, { passive: true });

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

const showcaseModal = document.getElementById("showcaseModal");
const showcaseModalImage = document.getElementById("showcaseModalImage");
const showcaseModalTitle = document.getElementById("showcaseModalTitle");
const showcaseCards = document.querySelectorAll(".showcase-card");

function closeShowcaseModal() {
  if (!showcaseModal) return;
  showcaseModal.classList.remove("open");
  showcaseModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("showcase-open");
}

showcaseCards.forEach(card => {
  card.addEventListener("click", () => {
    if (!showcaseModal || !showcaseModalImage || !showcaseModalTitle) return;
    const image = card.dataset.showcaseImage;
    const title = card.dataset.showcaseTitle || "Showcase";
    showcaseModalImage.src = image;
    showcaseModalImage.alt = `${title} preview`;
    showcaseModalTitle.textContent = title;
    showcaseModal.classList.add("open");
    showcaseModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("showcase-open");
  });
});

showcaseModal?.querySelectorAll(".showcase-modal-close, .showcase-modal-backdrop").forEach(button => {
  button.addEventListener("click", closeShowcaseModal);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && showcaseModal?.classList.contains("open")) {
    closeShowcaseModal();
  }
});


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
        const dist = Math.hypot(dx, dy);
        if (dist > settings.linkDistance) continue;

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

  resize();
  if (reduceMotion) draw(0);
  else raf = requestAnimationFrame(draw);
})();
