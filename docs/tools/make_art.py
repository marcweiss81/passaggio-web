"""One-off crop/resize/compress of approved app assets. Requires Pillow, never used by build.py."""
from pathlib import Path
import argparse
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = Path(r"C:\Users\Administrator\dev\passaggio-build\wt-volume-redline-20261102")


def save(image, path, quality, max_kb):
    path.parent.mkdir(parents=True, exist_ok=True)
    while True:
        image.save(path, quality=quality, **({"method": 6} if path.suffix == ".webp" else {}))
        if path.stat().st_size <= max_kb * 1000:
            print(f"{path.relative_to(ROOT)}: {image.width}x{image.height}, quality {quality}, {path.stat().st_size:,} bytes")
            return
        if quality == 60:
            raise RuntimeError(f"{path.name}: {path.stat().st_size} bytes exceeds {max_kb} KB at quality 60")
        quality = max(60, quality - 5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    source = parser.parse_args().source
    out = ROOT / "assets/art"
    resample = Image.Resampling.LANCZOS
    with Image.open(source / "assets/branding/approved/approved-logo-20261028-mobile.png") as original:
        logo = original.convert("RGB")
        for width, height, limit in ((1467, 605, 140), (960, 396, 70), (480, 198, 25)):
            save(logo.resize((width, height), resample), out / f"logo-{width}.webp", 82, limit)
        og = Image.new("RGB", (1200, 630), "#000000")
        resized = logo.resize((1200, round(logo.height * 1200 / logo.width)), resample)
        og.paste(resized, (0, (630 - resized.height) // 2))
        save(og, out / "logo-og.jpg", 85, 90)
    for name, filename, top in (("home", "01-home.jpg", 90), ("lesson-intro", "02-lesson-intro.jpg", 70), ("lesson", "03-lesson-running.jpg", 60)):
        with Image.open(source / "docs/design/s25-review-2026-10-29" / filename) as image:
            assert image.width >= 900 and image.height >= top + 1740, (filename, image.size)
            cropped = image.crop((0, top, 900, top + 1740)).convert("RGB")
            save(cropped.resize((520, 1005), resample), out / f"screen-{name}.webp", 78, 60)
    with Image.open(source / "assets/anatomy/lesson-profile.png") as image:
        save(image.convert("RGBA").resize((480, 480), resample), out / "anatomy-profile.webp", 82, 45)
    for name, filename in (("fork", "tuning-fork.png"), ("wave", "sound-wave.png"), ("trophy", "trophy.png")):
        with Image.open(source / "assets/icons/ivory" / filename) as image:
            save(image.convert("RGBA").resize((144, 144), resample), out / f"icon-{name}.webp", 85, 14)
    for name in ("CormorantGaramond-Light.ttf", "OFL-CormorantGaramond.txt"):
        dest = ROOT / "assets/fonts" / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / "assets/fonts" / name, dest)
        print(dest.relative_to(ROOT))


if __name__ == "__main__":
    main()
