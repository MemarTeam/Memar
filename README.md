# Memar website

The website of Memar (معمار), the student-led architecture team. Arabic by default, with an English version.

Plain HTML, CSS and JavaScript: no build step and nothing to install. Hosted free on GitHub Pages; content and members live in a free Firebase project.

## What's where

| Path | What it is |
|---|---|
| `index.html`, `about.html`, `events.html`, `magazine.html`, `podcast.html`, `join.html` | The public pages. Arabic text is in the HTML; the English sits beside it in `data-en`. |
| `members/index.html` | The members' area (sign-in, content, tools, board pages). |
| `assets/css/site.css` | Colours (light and dark), fonts and every public-site component. |
| `assets/css/members.css` | The members' area. |
| `assets/js/boot.js` | Runs first on every page: light or dark, and the fonts the board chose. |
| `assets/js/i18n.js` | Language switch and every interface string, in Arabic and English. |
| `assets/js/data.js` | The one way into the data. Picks Firebase or the demo. |
| `assets/js/fb.js` | Firebase: sign-in, content, members, edit history. |
| `assets/js/demo.js` | Demo data kept in the browser, used until Firebase is set up. |
| `assets/js/site.js` | Draws the public pages from the content. |
| `assets/js/story.js` | The logo story on the About page, with its default text. |
| `assets/js/members.js` | The members' area pages. |
| `assets/js/announce.js`, `assets/js/tools.js` | The announcement maker, the QR code maker and the brand kit. |
| `assets/js/memar-film-core.js`, `assets/js/workshop-core.js` | The logo film and the announcement film. |
| `firestore.rules` | Who can read and write what. Paste into Firebase. |

## Running it

Until `assets/js/firebase-config.js` has a config, the site runs as a demo with example data stored only in your browser.
Add `?demo=launch` to any page to see the site as it looks on day one, or `?demo=full` for the example content.

To try it on your computer, serve the folder (for example `python3 -m http.server`) and open `http://localhost:8000`.
Opening the files directly from disk won't work, because browsers block modules on `file://`.

Setup, adding sections and tools, and managing members are covered in the handover document.
