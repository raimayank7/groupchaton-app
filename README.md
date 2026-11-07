# GroupChatOn app

The installable reading app for www.groupchaton.com, at https://novel.groupchaton.com: every novel and chapter of the blog,
a library of followed novels, continue-where-you-stopped, reading settings (Light / Sepia / Dark / Black, font, size,
spacing) and offline reading. Until 2 Nov 2026 this address was the "Infinity App" of record tools; those tools now live
on https://infinity.groupchaton.com, and the app helps people move their old records there (`/old-records/`).

- `index.html` (+ `404.html`, a copy) · `reader.js` · `reader.css` · `sw.js` · `app.webmanifest` · `brand/`
- `data/novels.json` and `c/<yyyy>/<mm>/<name>.json`: novels and chapter text, built every hour by
  `scripts/build_data.py` (`.github/workflows/build.yml`) from the blog's public feed and pages. The book list
  (titles, covers, which addresses belong to which book) comes from the groupchaton-theme repo (`data/series-config.json`).
- `t/<id>/`: the old Infinity App tool addresses, sending people to the same tool on Infinity.
- After changing the app files: `python -X utf8 scripts/release.py` (new version, 404.html, redirects), commit, push.
- Test locally: `python -X utf8 scripts/serve.py 4173` (behaves like GitHub Pages).

Designed & Developed by Nivesh Sahayak. See LICENSE.
