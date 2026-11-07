/* Runs in the <head> before the page paints: picks light or dark, and applies the fonts the board chose.
   Both are remembered in this browser, so returning visitors never see the page change after it loads.
   Exposes window.MemarLook for the page scripts. */
(function () {
  'use strict';
  var DEFAULT_FONTS = { arHead: 'Noto Kufi Arabic', arBody: 'IBM Plex Sans Arabic', enHead: 'Archivo', enBody: 'IBM Plex Sans', mono: 'IBM Plex Mono' };
  var VARS = { arHead: '--f-ar-head', arBody: '--f-ar-body', enHead: '--f-en-head', enBody: '--f-en-body', mono: '--f-mono' };
  var THEME_KEY = 'memar-theme';   // the visitor's own choice
  var LOOK_KEY = 'memar-look';     // the board's fonts and default appearance, as last seen
  var GROUND = { light: '#F3F1EB', dark: '#0A1C2F' };
  var root = document.documentElement;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  // a font name may only hold letters, digits, spaces and hyphens, so it can't break out of the CSS
  function clean(n) { return String(n || '').replace(/[^A-Za-z0-9 \-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60); }

  var cached = null;
  try { cached = JSON.parse(get(LOOK_KEY)); } catch (e) { cached = null; }

  // Adds a Google Fonts stylesheet for a family. Fonts come in different weights, so it asks for the usual
  // range first and falls back to fewer weights if Google refuses the request.
  var loaded = {};
  function loadFont(name) {
    name = clean(name);
    if (!name || loaded[name]) return;
    loaded[name] = true;
    var specs = [':wght@400;500;600;700;800', ':wght@400;700', ''];
    var i = 0;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    var url = function () { return 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(name).replace(/%20/g, '+') + specs[i] + '&display=swap'; };
    link.onerror = function () { i++; if (i < specs.length) link.href = url(); };
    link.href = url();
    document.head.appendChild(link);
  }

  function fontsOf(look) {
    var f = (look && look.fonts) || {}, out = {};
    Object.keys(DEFAULT_FONTS).forEach(function (k) { out[k] = clean(f[k]) || DEFAULT_FONTS[k]; });
    return out;
  }
  function applyFonts(look) {
    var f = fontsOf(look), css = 'html:root{';
    Object.keys(VARS).forEach(function (k) {
      css += VARS[k] + ":'" + f[k] + "';";
      if (f[k] !== DEFAULT_FONTS[k]) loadFont(f[k]);
    });
    css += '}';
    var st = document.getElementById('memar-look');
    if (!st) { st = document.createElement('style'); st.id = 'memar-look'; document.head.appendChild(st); }
    st.textContent = css;
  }

  function boardDefault() { var t = cached && cached.theme; return t === 'dark' || t === 'auto' ? t : 'light'; }
  function systemDark() { try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } }
  function resolve() {
    var t = get(THEME_KEY);
    if (t !== 'light' && t !== 'dark') t = boardDefault();
    if (t === 'auto') t = systemDark() ? 'dark' : 'light';
    return t;
  }
  function setTheme(t, remember) {
    root.setAttribute('data-theme', t);
    if (remember) set(THEME_KEY, t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', root.hasAttribute('data-members') ? (t === 'dark' ? '#0A1C2F' : '#082F54') : GROUND[t]);
    try { window.dispatchEvent(new CustomEvent('memar-theme', { detail: t })); } catch (e) { /* old browser */ }
  }

  setTheme(resolve());
  applyFonts(cached);
  // The page files hold the original Arabic words. English, and any words the board changed (Page text), are put
  // in by the page script; until it runs, those words wait hidden so the page doesn't change in front of the visitor.
  if (!root.hasAttribute('data-members')) {
    var en = false;
    try { var q = new URLSearchParams(location.search).get('lang'); en = q ? q === 'en' : get('memar-lang') === 'en'; } catch (e) { /* old browser */ }
    if (en || get('memar-copy')) {
      root.classList.add('copy-wait');
      setTimeout(function () { root.classList.remove('copy-wait'); }, 2500);
    }
  }
  try {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (!get(THEME_KEY) && boardDefault() === 'auto') setTheme(resolve());
    });
  } catch (e) { /* old browser */ }

  window.MemarLook = {
    DEFAULT_FONTS: DEFAULT_FONTS,
    clean: clean,
    loadFont: loadFont,
    fonts: function () { return fontsOf(cached); },
    theme: function () { return root.getAttribute('data-theme') || 'light'; },
    toggleTheme: function () { setTheme(this.theme() === 'dark' ? 'light' : 'dark', true); return this.theme(); },
    // called with the board's saved look once it has loaded
    update: function (look) {
      cached = look && (look.fonts || look.theme) ? { fonts: look.fonts || {}, theme: look.theme || 'light' } : null;
      set(LOOK_KEY, cached ? JSON.stringify(cached) : null);
      applyFonts(cached);
      if (!get(THEME_KEY)) setTheme(resolve());
    },
    preview: applyFonts
  };
})();
