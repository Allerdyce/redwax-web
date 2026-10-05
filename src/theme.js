// Apply the saved choice before the body paints; CSS follows the system without JS.
(() => {
  const storageKey = 'redwax-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const stylesheet = document.getElementById('dark-theme');
  const validChoice = (value) => value === 'light' || value === 'dark' ? value : null;
  let choice = null;
  try { choice = validChoice(localStorage.getItem(storageKey)); } catch {}
  let toggle;
  const apply = () => {
    const dark = (choice ?? (system.matches ? 'dark' : 'light')) === 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    stylesheet.media = dark ? 'all' : 'not all';
    if (toggle) {
      toggle.setAttribute('aria-checked', String(dark));
      toggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }
  };
  apply();
  document.addEventListener('DOMContentLoaded', () => {
    toggle = document.querySelector('.theme-toggle');
    if (!toggle) return;
    apply();
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      choice = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(storageKey, choice); } catch {}
      apply();
    });
  });
  system.addEventListener('change', () => { if (!choice) apply(); });
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey || event.key === null) {
      choice = validChoice(event.newValue);
      apply();
    }
  });
})();
