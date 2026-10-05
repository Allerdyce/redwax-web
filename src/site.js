const slider = document.getElementById('keeper-target');
if (slider) {
  const output = document.getElementById('keeper-target-value');
  const update = () => {
    const percent = 100 * (Number(slider.value) - Number(slider.min)) / (Number(slider.max) - Number(slider.min));
    output.value = 'about ' + slider.value;
    slider.style.background = `linear-gradient(to right,var(--accent) ${percent}%,var(--fill) ${percent}%)`;
  };
  slider.addEventListener('input', update);
  update();
}

document.querySelectorAll('.hero-app-preview').forEach((preview) => {
  const window = preview.querySelector('.hero-app-window');
  const fit = () => {
    const scale = preview.clientWidth / 1280;
    window.style.transform = `scale(${scale})`;
    preview.style.height = `${820 * scale}px`;
  };
  new ResizeObserver(fit).observe(preview);
  fit();
});

const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.nav-menu');
if (toggle && menu) {
  const close = () => { toggle.setAttribute('aria-expanded', 'false'); menu.classList.remove('is-open'); };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  });
  menu.addEventListener('click', (event) => { if (event.target.closest('a')) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && menu.classList.contains('is-open')) { close(); toggle.focus(); } });
  const smallScreen = matchMedia('(max-width: 860px)');
  smallScreen.addEventListener('change', close);
}

if (document.body.dataset.page === 'index') {
  const nav = document.querySelector('.site-nav');
  const sections = Array.from(document.querySelectorAll('.nav-menu [data-nav-section]'), (link) => ({
    link,
    section: document.getElementById(link.dataset.navSection),
  })).filter(({ section }) => section);
  let activeLink = null;
  let scheduled = false;

  const updateCurrentSection = () => {
    scheduled = false;
    const readingLine = nav.getBoundingClientRect().height + Math.min(160, innerHeight * 0.2);
    const current = sections.find(({ section }) => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= readingLine && bounds.bottom > readingLine;
    })?.link ?? null;
    if (current === activeLink) return;
    activeLink?.removeAttribute('aria-current');
    current?.setAttribute('aria-current', 'location');
    activeLink = current;
  };
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateCurrentSection);
  };
  addEventListener('scroll', scheduleUpdate, { passive: true });
  addEventListener('resize', scheduleUpdate);
  addEventListener('hashchange', scheduleUpdate);
  addEventListener('pageshow', scheduleUpdate);
  updateCurrentSection();
}
