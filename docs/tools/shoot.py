"""Capture the two review pages with installed Chrome; no browser dependency."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import base64
import io
import json
import os
import socket
import struct
import subprocess
import tarfile
import tempfile
import threading
import time
from urllib.request import urlopen
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
CHROME = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
OUT = ROOT / "docs/evidence/app-look-20261103"


class DevTools:
    """Minimal stdlib WebSocket client for Chrome's local DevTools endpoint."""
    def __init__(self, url):
        target = urlsplit(url)
        self.sock = socket.create_connection((target.hostname, target.port), timeout=15)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall((f"GET {target.path} HTTP/1.1\r\nHost: {target.netloc}\r\n"
                           f"Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n"
                           "Sec-WebSocket-Version: 13\r\n\r\n").encode())
        self.stream = self.sock.makefile("rb")
        status = self.stream.readline()
        if b" 101 " not in status:
            raise RuntimeError(f"DevTools WebSocket handshake: {status!r}")
        while self.stream.readline() != b"\r\n":
            pass
        self.sequence = 0

    def exact(self, count):
        data = self.stream.read(count)
        if len(data) != count:
            raise RuntimeError("Chrome closed its DevTools socket")
        return data

    def call(self, method, params=None):
        self.sequence += 1
        payload = json.dumps({"id": self.sequence, "method": method, "params": params or {}}).encode()
        size = len(payload)
        head = bytes((0x81, 0x80 | size)) if size < 126 else bytes((0x81, 0xfe)) + struct.pack("!H", size) if size < 65536 else bytes((0x81, 0xff)) + struct.pack("!Q", size)
        mask = os.urandom(4)
        self.sock.sendall(head + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))
        fragments = bytearray()
        while True:
            first, second = self.exact(2)
            size = second & 127
            if size == 126:
                size = struct.unpack("!H", self.exact(2))[0]
            elif size == 127:
                size = struct.unpack("!Q", self.exact(8))[0]
            data = self.exact(size)
            if first & 15 == 8:
                raise RuntimeError("Chrome closed its DevTools connection")
            fragments.extend(data)
            if not first & 128:
                continue
            reply = json.loads(fragments)
            fragments.clear()
            if reply.get("id") == self.sequence:
                if "error" in reply:
                    raise RuntimeError(reply["error"])
                return reply.get("result", {})

    def evaluate(self, expression):
        result = self.call("Runtime.evaluate", {"expression": expression, "returnByValue": True})
        if "exceptionDetails" in result:
            raise RuntimeError(result["exceptionDetails"])
        return result["result"].get("value")

    def close(self):
        self.stream.close()
        self.sock.close()


def capture(page, width, height, phase):
    dest = OUT / f"{phase}-{page}-{width}.png"
    with tempfile.TemporaryDirectory(prefix="passaggio-web-shoot-", ignore_cleanup_errors=True) as profile:
        # Windows Chrome's CLI screenshot can clamp a 360px window to a wider CSS
        # viewport and race image/font loading. Set exact metrics through Chrome
        # itself and wait for assets before capture; no Playwright or site JS.
        process = subprocess.Popen([
            str(CHROME), "--headless=new", "--disable-gpu", "--hide-scrollbars",
            "--force-device-scale-factor=1", f"--user-data-dir={profile}",
            f"--window-size={width},{height}", "--remote-debugging-port=0", "about:blank",
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        client = None
        try:
            port_file = Path(profile) / "DevToolsActivePort"
            deadline = time.monotonic() + 20
            while not port_file.exists():
                if process.poll() is not None or time.monotonic() > deadline:
                    raise RuntimeError(f"Chrome DevTools startup failed (exit {process.poll()})")
                time.sleep(.1)
            port = port_file.read_text().splitlines()[0]
            with urlopen(f"http://127.0.0.1:{port}/json/list", timeout=10) as response:
                targets = json.load(response)
            client = DevTools(next(t["webSocketDebuggerUrl"] for t in targets if t["type"] == "page"))
            client.call("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False})
            client.call("Page.enable")
            client.call("Page.navigate", {"url": f"http://127.0.0.1:8796/{page}.html"})
            deadline = time.monotonic() + 25
            ready = """document.readyState === 'complete' && document.fonts.status === 'loaded' &&
              [...document.images].filter(i => i.getClientRects().length && i.getBoundingClientRect().top < innerHeight)
              .every(i => i.complete && i.naturalWidth > 0)"""
            while not client.evaluate(ready):
                if time.monotonic() > deadline:
                    raise RuntimeError(f"Images/fonts not ready: {phase} {page} {width}")
                time.sleep(.1)
            time.sleep(1)  # Let the single phone entry animation reach its final state.
            metrics = client.evaluate("""({viewport:innerWidth, scroll:document.documentElement.scrollWidth,
              phones:[...document.querySelectorAll('.phone')].filter(e=>e.getClientRects().length).map(e=>{let r=e.getBoundingClientRect();return {x:r.x,width:r.width,centre:r.x+r.width/2}}),
              sideImageRequests:performance.getEntriesByType('resource').filter(r=>/screen-(home|lesson-intro)\\.webp/.test(r.name)).length})""")
            if metrics["viewport"] != width or metrics["scroll"] > width:
                raise RuntimeError(f"Viewport/overflow check failed: {metrics}")
            if phase == "after" and page == "index":
                expected = 1 if width <= 760 else 3
                if len(metrics["phones"]) != expected or abs(metrics["phones"][expected // 2]["centre"] - width / 2) > 1:
                    raise RuntimeError(f"Phone centring failed: {metrics}")
                if width <= 760 and metrics["sideImageRequests"]:
                    raise RuntimeError(f"Hidden side phones downloaded: {metrics}")
            shot = client.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False,
                "clip": {"x": 0, "y": 0, "width": width, "height": height, "scale": 1}})
            dest.write_bytes(base64.b64decode(shot["data"]))
            print(f"{dest.relative_to(ROOT)} {json.dumps(metrics)}", flush=True)
            if phase == "after":
                client.call("Input.dispatchKeyEvent", {"type": "keyDown", "key": "Tab", "code": "Tab", "windowsVirtualKeyCode": 9})
                client.call("Input.dispatchKeyEvent", {"type": "keyUp", "key": "Tab", "code": "Tab", "windowsVirtualKeyCode": 9})
                focus = client.evaluate("""(() => {
                  const checks=[['.brand','rgb(230, 210, 154)',false],['.btn:not(.secondary)','rgb(20, 18, 16)',true],
                    ['.btn.secondary','rgb(230, 210, 154)',false],['.menu-btn','rgb(20, 18, 16)',true],
                    ['.nav .cta','rgb(20, 18, 16)',true],['details.disclosure > summary','rgb(20, 18, 16)',true]];
                  return checks.flatMap(([selector,ink,inset])=>{
                    const e=document.querySelector(selector); if(!e || !e.getClientRects().length)return [];
                    e.focus({preventScroll:true}); const s=getComputedStyle(e);
                    return [{selector,pass:e.matches(':focus-visible') && s.outlineWidth==='2px' && s.outlineColor===ink && (!inset || parseFloat(s.outlineOffset)<0)}];
                  });
                })()""")
                if not all(check["pass"] for check in focus):
                    raise RuntimeError(f"Focus check failed: {focus}")
                client.call("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-reduced-motion", "value": "reduce"}]})
                motion = client.evaluate("""[...document.querySelectorAll('.site-header.home .brand img,.phone')].every(e=>getComputedStyle(e).animationName==='none') &&
                  [...document.querySelectorAll('.btn,.nav .cta,.menu-btn')].every(e=>getComputedStyle(e).transitionDuration==='0s')""")
                if not motion:
                    raise RuntimeError("Reduced-motion check failed")
                print(f"Focus: PASS ({len(focus)} faces); reduced motion: PASS", flush=True)
        finally:
            if client:
                client.close()
            process.terminate()
            process.wait(timeout=15)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("before", "after"))
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="passaggio-web-base-") as baseline:
        directory = ROOT
        if args.phase == "before":
            archive = subprocess.check_output(["git", "archive", "f4c5296"], cwd=ROOT)
            with tarfile.open(fileobj=io.BytesIO(archive)) as tree:
                tree.extractall(baseline, filter="data")
            directory = Path(baseline)
        server = ThreadingHTTPServer(("127.0.0.1", 8796), partial(SimpleHTTPRequestHandler, directory=str(directory)))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            for page in ("index", "features"):
                for width, height in ((360, 3600), (1440, 2600)):
                    capture(page, width, height, args.phase)
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    main()
