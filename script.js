(() => {
  // =============== CONFIG ===============
  const USE_UTC = true;              // rotate by UTC hour
  const COUNT   = 12;                // 12 backgrounds
  const THEME_KEY = "bgr-theme";     // "light" | "dark"

  // Light & dark soft gradients (12 each)
  const LIGHT_GRADIENTS = [
    "linear-gradient(120deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)",
    "linear-gradient(120deg, #f6d365 0%, #fda085 100%)",
    "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
    "linear-gradient(120deg, #cfd9df 0%, #e2ebf0 100%)",
    "linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)",
    "linear-gradient(120deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(120deg, #5ee7df 0%, #b490ca 100%)",
    "linear-gradient(120deg, #c79081 0%, #dfa579 100%)",
    "linear-gradient(120deg, #96fbc4 0%, #f9f586 100%)",
    "linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%)",
    "linear-gradient(120deg, #fddb92 0%, #d1fdff 100%)"
  ];
  const DARK_GRADIENTS = [
    "linear-gradient(120deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    "linear-gradient(120deg, #232526 0%, #414345 100%)",
    "linear-gradient(120deg, #141e30 0%, #243b55 100%)",
    "linear-gradient(120deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)",
    "linear-gradient(120deg, #20002c 0%, #cbb4d4 100%)",
    "linear-gradient(120deg, #232526 0%, #414345 50%, #000000 100%)",
    "linear-gradient(120deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    "linear-gradient(120deg, #1e130c 0%, #9a8478 100%)",
    "linear-gradient(120deg, #00223e 0%, #a0d7ff 100%)",
    "linear-gradient(120deg, #2b5876 0%, #4e4376 100%)",
    "linear-gradient(120deg, #16222a 0%, #3a6073 100%)",
    "linear-gradient(120deg, #304352 0%, #0b8793 100%)"
  ];

  // =============== UTIL ===============
  const hour = useUtc => (useUtc ? new Date().getUTCHours() : new Date().getHours());
  const idxForHour = h => (h % COUNT);
  function msUntilNextHour(useUtc) {
    const now = new Date();
    const next = new Date(now.getTime());
    if (useUtc) { next.setUTCMinutes(0,0,0); next.setUTCHours(now.getUTCHours()+1); }
    else        { next.setMinutes(0,0,0);     next.setHours(now.getHours()+1); }
    return next - now;
  }

  // =============== THEME ===============
  function getTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark" : "light";
  }
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    applyBackground();
    updateThemeIcon(theme);
    // element-level theme (no global tinting)
    // (paper + instructions pick up CSS variables automatically)
  }
  function toggleTheme() { setTheme(getTheme() === "dark" ? "light" : "dark"); }

  // =============== STYLES ===============
  function injectStyles() {
    if (document.getElementById("bgr-styles")) return;
    const css = `
:root {
  color-scheme: light;
  --page-text: #0e141b;
  --page-bg: #f7f9fc;

  --nav-bg: rgba(255,255,255,0.75);
  --nav-fg: #10151a;
  --nav-border: rgba(0,0,0,0.08);
  --shadow: 0 8px 24px rgba(0,0,0,0.15);

  /* documentLikeDesign (paper) */
  --paper-bg: #ffffff;
  --paper-fg: #0e141b;
  --paper-border: rgba(0,0,0,0.05);
  --paper-inner: rgba(0,0,0,0.2);
  --paper-s1: rgba(0,0,0,0.15);
  --paper-s2: rgba(0,0,0,0.10);
  --paper-s3: rgba(0,0,0,0.08);

  /* buttons */
  --btn-bg: #121a27;
  --btn-fg: #ffffff;
  --btn-bg-hover: #0f1622;
  --btn-border: rgba(0,0,0,0.15);

  /* instructions */
  --inst-card-bg: rgba(255,255,255,0.78);
  --inst-card-fg: #0e141b;
  --inst-border: rgba(0,0,0,0.08);
  --inst-summary-bg: #121a27;
  --inst-summary-fg: #ffffff;
  --inst-summary-bg-hover: #0f1622;
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --page-text: #e6edf3;
  --page-bg: #0b1117;

  --nav-bg: rgba(18,22,28,0.65);
  --nav-fg: #e8eef5;
  --nav-border: rgba(255,255,255,0.08);
  --shadow: 0 10px 28px rgba(0,0,0,0.45);

  --paper-bg: #0f1620;
  --paper-fg: #e6edf3;
  --paper-border: rgba(255,255,255,0.08);
  --paper-inner: rgba(255,255,255,0.12);
  --paper-s1: rgba(0,0,0,0.35);
  --paper-s2: rgba(0,0,0,0.25);
  --paper-s3: rgba(0,0,0,0.18);

  --btn-bg: #e6edf3;
  --btn-fg: #0b1117;
  --btn-bg-hover: #d8e2ea;
  --btn-border: rgba(255,255,255,0.14);

  --inst-card-bg: rgba(18,22,28,0.7);
  --inst-card-fg: #e6edf3;
  --inst-border: rgba(255,255,255,0.1);
  --inst-summary-bg: #e6edf3;
  --inst-summary-fg: #0b1117;
  --inst-summary-bg-hover: #d8e2ea;
}

/* base text / bg */
body {
  color: var(--page-text);
  background-color: var(--page-bg);
  background-attachment: fixed;
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  transition: color 250ms ease, background-color 300ms ease, background-image 800ms ease;
}

/* top-right minimal nav */
.bgr-nav {
  position: fixed; top:14px; right:14px;
  display:flex; align-items:center;
  background: var(--nav-bg); color: var(--nav-fg);
  border: 1px solid var(--nav-border);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  box-shadow: var(--shadow);
  border-radius: 999px; padding: 6px;
  z-index: 10000;
}
.bgr-icon-btn {
  display:grid; place-items:center;
  width:36px; height:36px; border-radius:999px;
  border:none; background:transparent; color:inherit; cursor:pointer;
  transition: transform 200ms ease, background 200ms ease;
}
.bgr-icon-btn:hover { transform: translateY(-1px) scale(1.03); background: rgba(0,0,0,0.06); }
:root[data-theme="dark"] .bgr-icon-btn:hover { background: rgba(255,255,255,0.10); }

/* paper follows theme directly */
#documentLikeDesign {
  background: var(--paper-bg) !important;
  color: var(--paper-fg) !important;
  border: 1px solid var(--paper-border) !important;
  border-radius: 2px;
  box-shadow:
    inset 0 0 2px var(--paper-inner),
    0 1px 2px var(--paper-s1),
    0 2px 6px var(--paper-s2),
    0 6px 12px var(--paper-s3);
}
#documentLikeDesign h1, 
#documentLikeDesign h2, 
#documentLikeDesign h3, 
#documentLikeDesign h4,
#documentLikeDesign p, 
#documentLikeDesign li {
  color: var(--paper-fg);
}

/* ===== Modernized existing Instructions details ===== */

/* center the instructions container (assumes #instructions is outside the paper) */
#instructions {
  position: relative;
  display: grid;
  place-items: center;
  margin: 16px 0 28px;
  z-index: 9999; /* sit above background */
}

/* the <details> acts like a compact card anchored center */
#instructions details {
  width: min(920px, 92vw);
  border: 1px solid var(--inst-border);
  border-radius: 14px;
  background: var(--inst-card-bg);
  color: var(--inst-card-fg);
  box-shadow: var(--shadow);
  overflow: clip;
}

/* the summary behaves like a modern button header */
#instructions .instructions-summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  padding: 14px 18px;
  background: var(--inst-summary-bg);
  color: var(--inst-summary-fg);
  border-bottom: 1px solid var(--inst-border);
  font: 600 14px/1.1 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  user-select: none;
  transition: background 200ms ease, color 200ms ease;
}
#instructions .instructions-summary::-webkit-details-marker { display: none; }
#instructions .instructions-summary:hover { background: var(--inst-summary-bg-hover); }

/* add a chevron that rotates on open */
#instructions .instructions-summary::after {
  content: "";
  width: 10px; height: 10px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform 220ms ease;
}
#instructions details[open] .instructions-summary::after {
  transform: rotate(-135deg);
}

/* animated body: smooth expand/collapse */
#instructions .instructions-body {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
  transition:
    max-height 320ms ease,
    opacity 240ms ease,
    transform 240ms ease;
  padding: 0 18px; /* padding anim managed via open state */
}
#instructions details[open] .instructions-body {
  /* JS sets inline max-height to the scrollHeight for smooth animation */
  opacity: 1;
  transform: translateY(0);
  padding: 14px 18px 18px;
}
    `.trim();
    const style = document.createElement("style");
    style.id = "bgr-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // =============== NAV + ICONS (moon in light, sun in dark) ===============
  function sunIcon() {
    return `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="4"></circle>
  <line x1="12" y1="1"  x2="12" y2="3"></line>
  <line x1="12" y1="21" x2="12" y2="23"></line>
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
  <line x1="1" y1="12" x2="3" y2="12"></line>
  <line x1="21" y1="12" x2="23" y2="12"></line>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
</svg>`;
  }
  function moonIcon() {
    return `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
</svg>`;
  }
  // Show moon in light mode (next is dark), sun in dark mode (next is light)
  function themeIconSVG(theme) { return theme === "dark" ? sunIcon() : moonIcon(); }

  function buildNavbar() {
    if (document.querySelector(".bgr-nav")) return;
    const nav = document.createElement("nav");
    nav.className = "bgr-nav";
    const btn = document.createElement("button");
    btn.className = "bgr-icon-btn";
    btn.title = "Toggle theme";
    btn.type = "button";
    btn.addEventListener("click", toggleTheme);
    nav.appendChild(btn);
    document.body.appendChild(nav);
    updateThemeIcon(getTheme());
  }
  function updateThemeIcon(theme) {
    const btn = document.querySelector(".bgr-icon-btn");
    if (!btn) return;
    btn.innerHTML = themeIconSVG(theme);
    btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
  }

  // =============== BACKGROUND ROTATION ===============
  function activePalette() {
    return (getTheme() === "dark") ? DARK_GRADIENTS : LIGHT_GRADIENTS;
  }
  function applyBackground() {
    const h = hour(USE_UTC);
    const i = idxForHour(h);
    const gradients = activePalette();
    document.body.style.backgroundImage = gradients[i];
  }
  function scheduleRotation() {
    applyBackground();
    const delay = msUntilNextHour(USE_UTC);
    setTimeout(() => {
      applyBackground();
      setInterval(applyBackground, 60 * 60 * 1000);
    }, delay);
  }

  // =============== INSTRUCTIONS: ACCESSIBILITY + ANIMATION ===============
  function enhanceInstructions() {
    const details = document.querySelector('#instructions details');
    const summary = document.querySelector('#instructions .instructions-summary');
    const body    = document.querySelector('#instructions .instructions-body');

    if (!details || !summary || !body) return;

    // a11y roles
    summary.setAttribute('role', 'button');
    summary.setAttribute('tabindex', '0');
    summary.setAttribute('aria-controls', 'instructions-body');
    body.id = 'instructions-body';

    // smooth open/close: animate max-height from 0 -> scrollHeight
    function setAnimatedHeight(opening) {
      if (opening) {
        body.style.maxHeight = body.scrollHeight + "px";
      } else {
        // collapse to 0
        body.style.maxHeight = body.scrollHeight + "px"; // set current
        // force reflow to apply start height before collapsing
        void body.offsetHeight;
        body.style.maxHeight = "0px";
      }
    }

    // initial state
    if (details.open) {
      body.style.maxHeight = body.scrollHeight + "px";
    } else {
      body.style.maxHeight = "0px";
    }

    // toggle handlers
    summary.addEventListener('click', () => {
      const willOpen = !details.open; // state after toggle
      requestAnimationFrame(() => setAnimatedHeight(willOpen));
    });
    summary.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); summary.click(); }
    });

    // keep aria-expanded in sync
    function syncAria() { summary.setAttribute('aria-expanded', details.open); }
    details.addEventListener('toggle', () => {
      syncAria();
      // when opened, fix the height after transition to allow content growth
      if (details.open) {
        setTimeout(() => { body.style.maxHeight = "none"; }, 340);
      }
    });
    syncAria();
  }

  // =============== BOOT ===============
  function boot() {
    injectStyles();
    buildNavbar();
    setTheme(getTheme()); // sets variables + paints + icons
    scheduleRotation();
    enhanceInstructions();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  // Tiny API if you need it later
  window.BGR = { setTheme, toggleTheme, applyBackground };
})();

(function setupInstructionsTOC() {
  const inst = document.querySelector('#instructions');
  const details = inst?.querySelector('details');
  const body = inst?.querySelector('.instructions-body');
  if (!inst || !details || !body) return;

  // 1) Turn each H2/H3 (with an id) into a section wrapper
  const heads = Array.from(body.querySelectorAll(':scope > h2[id], :scope > h3[id]'));
  if (!heads.length) return;

  const sections = [];
  heads.forEach(h => {
    const id = h.id.trim();
    if (!id) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'inst-section';
    wrapper.id = id + '-section';
    wrapper.setAttribute('data-title', h.textContent.trim());

    // move content from this heading until next heading (H2/H3 at same scope)
    wrapper.appendChild(h);
    let n = h.nextSibling;
    while (n && !(n.nodeType === 1 && (/^H[23]$/.test(n.tagName)) )) {
      const next = n.nextSibling;
      wrapper.appendChild(n);
      n = next;
    }
    body.insertBefore(wrapper, n || null);
    sections.push(wrapper);
  });

  // 2) Build TOC (prev | scroll chips | next)
  // Create container only once
  if (!details.querySelector('.inst-toc-wrap')) {
    const wrap = document.createElement('div');
    wrap.className = 'inst-toc-wrap';

    const btnPrev = document.createElement('button');
    btnPrev.className = 'toc-btn';
    btnPrev.type = 'button';
    btnPrev.setAttribute('aria-label', 'Scroll left');
    btnPrev.innerHTML = '&#x276E;';

    const btnNext = document.createElement('button');
    btnNext.className = 'toc-btn';
    btnNext.type = 'button';
    btnNext.setAttribute('aria-label', 'Scroll right');
    btnNext.innerHTML = '&#x276F;';

    const scroller = document.createElement('div');
    scroller.className = 'inst-toc-scroll';

    const ul = document.createElement('ul');
    ul.className = 'inst-toc';

    sections.forEach((sec, i) => {
      const li = document.createElement('li');
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = sec.getAttribute('data-title') || `Section ${i+1}`;
      chip.dataset.target = sec.id;
      li.appendChild(chip);
      ul.appendChild(li);
    });

    scroller.appendChild(ul);
    wrap.append(btnPrev, scroller, btnNext);
    details.insertBefore(wrap, body);

    // 3) Size chips so exactly 5 show at once
    const GAP = 8;
    function sizeChips() {
      const w = scroller.clientWidth;
      const chipWidth = Math.max(120, Math.floor((w - GAP*4) / 5));
      ul.querySelectorAll('.chip').forEach(ch => { ch.style.width = chipWidth + 'px'; });
    }
    sizeChips();
    new ResizeObserver(sizeChips).observe(scroller);

    // 4) Scroll animation for arrows
    function scrollByChips(dir = 1, count = 3) {
      const first = ul.querySelector('.chip');
      if (!first) return;
      const cw = first.getBoundingClientRect().width;
      const dist = (cw + GAP) * count * dir;
      ul.scrollBy({ left: dist, behavior: 'smooth' });
    }
    btnPrev.addEventListener('click', () => scrollByChips(-1));
    btnNext.addEventListener('click', () => scrollByChips(+1));

    // 5) Show/hide sections by wrapper id
    function showSection(sectionId) {
      sections.forEach(sec => { sec.hidden = (sec.id !== sectionId); });
      ul.querySelectorAll('.chip').forEach(b => b.classList.toggle('is-active', b.dataset.target === sectionId));
      if (details.open) {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    // 6) Chip click → show only that section
    ul.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      showSection(btn.dataset.target);
    });

    // 7) Initial: show the first section only
    showSection(sections[0].id);

    // 8) Keep current filter when summary opens/closes
    details.addEventListener('toggle', () => {
      const active = ul.querySelector('.chip.is-active') || ul.querySelector('.chip');
      if (active) showSection(active.dataset.target);
    });
  }
})();
