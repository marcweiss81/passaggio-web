#!/usr/bin/env python3
"""Generate the static Passaggio site: one shared layout, one HTML file per page.

Run `python3 build.py` after editing anything in pages/ or this file. The output
files at the repo root are what Cloudflare Pages (or Vercel) serves.
"""
from pathlib import Path

ROOT = Path(__file__).parent
PAGES = ROOT / "pages"

SITE_NAME = "Passaggio"
TAGLINE = "your voice’s path"
RELEASES = "https://github.com/marcweiss81/passaggio-releases/releases/latest"

NAV = [
    ("index.html", "Home"),
    ("features.html", "Features"),
    ("lessons.html", "Lessons"),
    ("how-it-works.html", "How it works"),
    ("faq.html", "FAQ"),
]

LAYOUT = """<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<meta name="theme-color" content="#040404">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:type" content="website">
<meta property="og:image" content="/assets/logo-lockup.png">
<link rel="icon" href="/assets/favicon.png" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css?v=noir6">
</head>
<body>
<header class="site-header{header_class}">
  <div class="container">
    <a class="brand" href="/"><img src="/assets/logo-lockup.png" alt="Passaggio home" width="2389" height="794"></a>
    <button class="menu-btn" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="nav" id="site-nav" aria-label="Main">
{nav}
      <a class="cta" href="/download.html">Download</a>
    </nav>
  </div>
</header>

<main>
{body}
</main>

<footer class="site-footer">
  <div class="container">
    <div>
      <div class="credit">passaggio · {tagline}</div>
      <div>An AI singing teacher for Android. © <span data-year>2026</span> Passaggio. Design: Marc Weiss design.</div>
    </div>
    <nav aria-label="Footer">
      <a href="/features.html">Features</a>
      <a href="/lessons.html">Lessons</a>
      <a href="/how-it-works.html">How it works</a>
      <a href="/download.html">Download</a>
      <a href="/faq.html">FAQ</a>
      <a href="/privacy.html">Privacy</a>
      <a href="{releases}" rel="noopener">GitHub releases</a>
    </nav>
  </div>
</footer>
<script src="/assets/site.js?v=noir2" defer></script>
<script src="/assets/demos.js?v=2" defer></script>
</body>
</html>
"""


def nav_html() -> str:
    lines = []
    for href, label in NAV:
        lines.append(f'      <a href="/{href}">{label}</a>')
    return "\n".join(lines)


def read_page(name: str) -> tuple[str, str, str]:
    """A page file starts with two header lines (title, description), then a blank line."""
    text = (PAGES / name).read_text(encoding="utf-8")
    header, _, body = text.partition("\n\n")
    title_line, description_line = header.splitlines()[:2]
    title = title_line.removeprefix("title: ").strip()
    description = description_line.removeprefix("description: ").strip()
    return title, description, body


def build() -> None:
    for page in sorted(PAGES.glob("*.html")):
        title, description, body = read_page(page.name)
        html = LAYOUT.format(
            title=title,
            description=description,
            nav=nav_html(),
            body=body,
            tagline=TAGLINE,
            releases=RELEASES,
            header_class=" home" if page.name == "index.html" else "",
        )
        (ROOT / page.name).write_text(html, encoding="utf-8")
        print("wrote", page.name)


if __name__ == "__main__":
    build()
