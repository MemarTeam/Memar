// Shared bits of markup for the public site and the members' area.
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// colours can be CSS variables, so the header logo follows the light or dark theme
export function logo(ink = 'var(--logo-ink)', tri = 'var(--logo-tri)', label = 'معمار') {
  const f = (c) => `style="fill:${c}"`;
  return `<svg viewBox="170 200 969 170" role="img" aria-label="${esc(label)}">
    <path ${f(ink)} d="M170 200 L255 285 L340 200 L340 370 L170 370 Z"/>
    <path ${f(ink)} d="M390 200 H532 L447 285 L532 370 H390 Z"/>
    <path ${f(ink)} d="M582.5 200 L667.5 285 L752.5 200 V370 H582.5 Z"/>
    <path ${f(ink)} d="M874 200 H880 L952 370 H803 Z"/>
    <path ${f(ink)} d="M1003 200 H1080 A57 57 0 0 1 1137 257 A57 57 0 0 1 1098 311.07 L1139 370 H1003 Z"/>
    <path ${f(tri)} d="M447 237 L495 285 L447 333 Z"/></svg>`;
}
export const tri = (cls = '') => `<svg class="tri ${cls}" viewBox="0 0 48 96" aria-hidden="true"><path d="M48 0 L0 48 L48 96 Z"/></svg>`;
// a play mark always points right, in both languages
export const play = (size = 16, color = 'currentColor') => `<svg class="tri-play" viewBox="0 0 48 96" width="${size / 2}" height="${size}" aria-hidden="true" style="margin-left:${size / 6}px"><path fill="${color}" d="M0 0 L48 48 L0 96 Z"/></svg>`;

// the appearance button: a moon offers dark, a sun offers light
const MOON = '<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" fill="currentColor"><path d="M16.2 12.6A7 7 0 0 1 7.4 3.8 7 7 0 1 0 16.2 12.6z"/></svg>';
const SUN = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10" cy="10" r="3.6" fill="currentColor" stroke="none"/><path d="M10 1.8v2.1M10 16.1v2.1M1.8 10h2.1M16.1 10h2.1M4.2 4.2l1.5 1.5M14.3 14.3l1.5 1.5M4.2 15.8l1.5-1.5M14.3 5.7l1.5-1.5"/></svg>';
export function themeButton(cls, labels, withText) {
  const dark = window.MemarLook && window.MemarLook.theme() === 'dark';
  const label = dark ? labels.light : labels.dark;
  // with words, the words say what the button does; as an icon, it's a pressed-or-not "Dark mode" switch
  const a11y = withText ? '' : ` aria-pressed="${dark}" aria-label="${esc(labels.dark)}"`;
  return `<button type="button" class="${cls}" data-theme-toggle${a11y}>${dark ? SUN : MOON}${withText ? `<span>${esc(label)}</span>` : ''}</button>`;
}
// wires every appearance button on the page and keeps their icons in step
export function bindTheme(root, labels) {
  root.querySelectorAll('[data-theme-toggle]').forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', () => { if (window.MemarLook) window.MemarLook.toggleTheme(); });
  });
  if (!window.__memarThemeSync) {
    window.__memarThemeSync = true;
    addEventListener('memar-theme', () => {
      document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
        const dark = window.MemarLook.theme() === 'dark';
        if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(dark));
        const txt = b.querySelector('span');
        b.innerHTML = (dark ? SUN : MOON) + (txt ? `<span>${esc(dark ? labels.light : labels.dark)}</span>` : '');
      });
    });
  }
}
