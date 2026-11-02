"""Compare page text with the approved copy base, ignoring markup and attributes."""
from difflib import unified_diff
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hidden = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.hidden -= 1

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def words(html):
    parser = Text()
    parser.feed(html)
    return " ".join(" ".join(parser.parts).split())


def main():
    failed = False
    for path in sorted((ROOT / "pages").glob("*.html")):
        old = subprocess.check_output(["git", "show", f"f4c5296:pages/{path.name}"], cwd=ROOT).decode("utf-8")
        before, after = words(old), words(path.read_text(encoding="utf-8"))
        if before != after:
            failed = True
            print(path.relative_to(ROOT))
            print("\n".join(unified_diff(before.split(), after.split(), fromfile="base", tofile="current")))
    print("Page text: " + ("FAIL" if failed else "unchanged from f4c5296"))
    return int(failed)


if __name__ == "__main__":
    sys.exit(main())
