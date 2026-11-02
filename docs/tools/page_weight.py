"""Conservative cold desktop home weight, counting all linked font faces and images."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re
import sys

ROOT = Path(__file__).resolve().parents[2]


def local(url):
    parts = urlsplit(url)
    if parts.scheme or parts.netloc or not parts.path:
        raise ValueError(f"Expected a local asset, got {url!r}")
    return ROOT / unquote(parts.path).lstrip("/")


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.css, self.code, self.images = set(), {ROOT / "index.html"}, set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "link" and a.get("rel") == "stylesheet":
            self.css.add(local(a["href"]))
        elif tag == "script" and a.get("src"):
            self.code.add(local(a["src"]))
        elif tag == "img":
            candidates = [local(a["src"])]
            candidates.extend(local(item.strip().split()[0]) for item in a.get("srcset", "").split(",") if item.strip())
            self.images.add(max(candidates, key=lambda p: p.stat().st_size))


def main():
    assets = Assets()
    assets.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    fonts = set()
    for css in assets.css:
        for face in re.findall(r"@font-face\s*\{([^}]+)\}", css.read_text(encoding="utf-8"), re.S):
            for url in re.findall(r"url\(\s*['\"]?([^)'\"\s]+)['\"]?\s*\)", face):
                fonts.add(local(url) if url.startswith("/") else css.parent / url)
    images = sum(p.stat().st_size for p in assets.images)
    code = sum(p.stat().st_size for p in assets.code | assets.css)
    font_bytes = sum(p.stat().st_size for p in fonts)
    total = images + code + font_bytes
    # Decimal KB/MB is the stricter reading of the requested budgets.
    print(f"Images: {images:,} bytes ({images / 1000:.2f} KB); limit 420 KB")
    print(f"HTML/CSS/JS: {code:,} bytes ({code / 1000:.2f} KB); limit 90 KB")
    print(f"Fonts: {font_bytes:,} bytes ({font_bytes / 1000:.2f} KB)")
    print(f"Total: {total:,} bytes ({total / 1_000_000:.3f} MB); limit 1.95 MB")
    failed = images > 420_000 or code > 90_000 or total > 1_950_000
    print("Weight: " + ("FAIL" if failed else "PASS"))
    return int(failed)


if __name__ == "__main__":
    sys.exit(main())
