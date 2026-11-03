"""Counts the colours the web app's code uses, and checks common text pairs for contrast.

Usage: python audit_colors.py
"""
import re
from collections import Counter
from pathlib import Path

WEB = Path(__file__).resolve().parents[3] / "apps/web"
files = [p for d in ("components", "app", "lib") for p in (WEB / d).rglob("*") if p.suffix in (".tsx", ".ts", ".css")]

fam = Counter()
shade = Counter()
utility = Counter()
hexes = Counter()
per_file = {}
USE = re.compile(r"\b(bg|text|border|ring|from|to|via|shadow|fill|stroke)-(green|emerald|teal|lime|gray|slate|zinc|neutral|red|rose|amber|orange|yellow|blue|sky|indigo|violet|purple|pink|fuchsia|cyan)-(\d{2,3})\b")
for f in files:
    t = f.read_text("utf-8", "ignore")
    found = USE.findall(t)
    for kind, family, level in found:
        fam[family] += 1
        shade[f"{family}-{level}"] += 1
        utility[f"{kind}-{family}-{level}"] += 1
    for h in re.findall(r"#[0-9a-fA-F]{6}\b", t):
        hexes[h.lower()] += 1
    per_file[f.name] = Counter(x[1] for x in found)

print("Colour families:", fam.most_common())
print("\nGreen-family shades:", [(k, v) for k, v in shade.most_common() if k.split("-")[0] in ("green", "emerald", "teal", "lime")])
print("\nTop green uses:", [(k, v) for k, v in utility.most_common() if k.split("-")[1] in ("green", "emerald")][:18])
print("\nNon-green accents:", [(k, v) for k, v in shade.most_common() if k.split("-")[0] not in ("green", "emerald", "gray", "teal", "lime")][:16])
print("\nDistinct raw hex colours:", len(hexes), hexes.most_common(24))
print("\nGradients using green:", sum(1 for f in files for _ in re.findall(r"from-(?:green|emerald)-\d+", f.read_text("utf-8", "ignore"))))


def lum(hex_):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (int(hex_[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a, b):
    x, y = sorted((lum(a), lum(b)), reverse=True)
    return round((x + 0.05) / (y + 0.05), 2)


# Tailwind v4 default palette, as sRGB.
PAIRS = [
    ("White on green-600 (Apply today)", "#ffffff", "#00a63e"),
    ("White on green-700", "#ffffff", "#008236"),
    ("White on emerald-700", "#ffffff", "#007a55"),
    ("White on green-800", "#ffffff", "#016630"),
    ("White on gray-900", "#ffffff", "#101828"),
    ("green-700 text on white", "#008236", "#ffffff"),
    ("green-700 text on green-50", "#008236", "#f0fdf4"),
    ("gray-500 text on white", "#6a7282", "#ffffff"),
    ("gray-400 on gray-100 (disabled)", "#99a1af", "#f3f4f6"),
    ("amber-700 on amber-50", "#bb4d00", "#fffbeb"),
]
print("\nContrast (4.5 needed for normal text, 3 for large or bold):")
for label, fg, bg in PAIRS:
    print(f"  {contrast(fg, bg):5}  {label}")
