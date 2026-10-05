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
  const smallScreen = matchMedia('(max-width: 760px)');
  smallScreen.addEventListener('change', close);
}
