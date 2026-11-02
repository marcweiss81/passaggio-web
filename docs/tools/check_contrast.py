"""Check the app-look text inks against each face's darkest specified shade."""
import sys

PAIRS = [
    ("ivory text", "#141210", "#b0a280"),
    ("ivory secondary", "#2a2622", "#b0a280"),
    ("lacquer text", "#f1ede4", "#26211b"),
    ("lacquer secondary", "#cfc9bc", "#26211b"),
    ("muted text", "#b9b5a6", "#26211b"),
    ("hero title", "#f0e2c3", "#000000"),
    ("kicker", "#c9ad7a", "#14110d"),
    ("ivory link", "#3f2d08", "#b0a280"),
]


def luminance(value):
    channels = [int(value[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in channels]
    return sum(a * b for a, b in zip(linear, (.2126, .7152, .0722)))


def main():
    failed = False
    for name, ink, face in PAIRS:
        light, dark = sorted((luminance(ink), luminance(face)), reverse=True)
        ratio = (light + .05) / (dark + .05)
        failed |= ratio < 4.5
        print(f"{name}: {ink} on {face} = {ratio:.2f}:1 {'PASS' if ratio >= 4.5 else 'FAIL'}")
    return int(failed)


if __name__ == "__main__":
    sys.exit(main())
