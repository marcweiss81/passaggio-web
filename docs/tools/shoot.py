"""Capture the two review pages with installed Chrome; no browser dependency."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse
import subprocess
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[2]
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
OUT = ROOT / "docs/evidence/app-look-20261103"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("before", "after"))
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 8796), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def capture(job):
        page, width, height = job
        dest = OUT / f"{args.phase}-{page}-{width}.png"
        with tempfile.TemporaryDirectory(prefix="passaggio-web-shoot-") as profile:
            result = subprocess.run([
                str(CHROME), "--headless=new", "--disable-gpu", "--hide-scrollbars",
                f"--user-data-dir={profile}", f"--window-size={width},{height}",
                "--virtual-time-budget=3000", f"--screenshot={dest}",
                f"http://127.0.0.1:8796/{page}.html",
            ], capture_output=True, text=True, timeout=90)
            if result.returncode or not dest.exists():
                raise RuntimeError(f"Chrome exit {result.returncode}: {result.stderr.strip()}")
        print(dest.relative_to(ROOT))

    try:
        jobs = [(page, w, h) for page in ("index", "features") for w, h in ((360, 3600), (1440, 2600))]
        with ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(capture, jobs))
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == "__main__":
    main()
