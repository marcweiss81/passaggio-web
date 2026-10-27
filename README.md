# Passaggio website

Static marketing site for the Passaggio Android app.

- Edit page bodies in `pages/*.html` (first two lines are the title and description).
- Shared header/footer/nav live in `build.py`.
- Run `python3 build.py` to regenerate the HTML files at the repo root.
- `assets/` holds the stylesheet, script and brand images.

Hosting: static. Cloudflare Pages (no build command, output directory `/`) or Vercel
(the generated HTML is committed, so no build step is needed).
