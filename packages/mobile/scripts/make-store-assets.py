#!/usr/bin/env python3
"""Generate Play Store listing graphics.

Outputs into packages/mobile/release/store-listing/:
  - icon-512.png         (512x512, required)
  - feature-graphic.png  (1024x500, required)

Run:  python3 scripts/make-store-assets.py
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, 'release', 'store-listing')
os.makedirs(OUT, exist_ok=True)

BG = (11, 13, 18, 255)
AMBER = (251, 191, 36, 255)
RED = (220, 38, 38, 255)
PURPLE = (168, 85, 247, 255)


def draw_swords(img, cx, cy, length, width, color_a=AMBER, color_b=RED, alpha=255):
    draw = ImageDraw.Draw(img, 'RGBA')

    def sword(angle_deg, color):
        ang = math.radians(angle_deg)
        cos_a, sin_a = math.cos(ang), math.sin(ang)
        pts_local = [
            (length, 0),
            (width, width),
            (-length + width * 2, 0),
            (width, -width),
        ]
        pts = [(cx + lx * cos_a - ly * sin_a, cy + lx * sin_a + ly * cos_a)
               for (lx, ly) in pts_local]
        col = (color[0], color[1], color[2], alpha)
        draw.polygon(pts, fill=col, outline=(0, 0, 0, alpha))

    sword(35, color_a)
    sword(-35, color_b)
    r = int(width * 1.1)
    draw.ellipse(
        (cx - r, cy - r, cx + r, cy + r),
        fill=(AMBER[0], AMBER[1], AMBER[2], alpha),
        outline=(0, 0, 0, alpha),
    )


def radial_bg(size_w, size_h):
    img = Image.new('RGBA', (size_w, size_h), BG)
    cx, cy = size_w // 2, size_h // 2
    pixels = img.load()
    max_r = math.hypot(size_w / 2, size_h / 2)
    for y in range(size_h):
        for x in range(size_w):
            d = math.hypot(x - cx, y - cy) / max_r
            t = max(0.0, 1.0 - d * 1.4)
            r = int(BG[0] + (AMBER[0] - BG[0]) * t * 0.18)
            g = int(BG[1] + (AMBER[1] - BG[1]) * t * 0.14)
            b = int(BG[2] + (AMBER[2] - BG[2]) * t * 0.10)
            pixels[x, y] = (r, g, b, 255)
    return img


def icon_512():
    img = radial_bg(512, 512)
    draw_swords(img, 256, 230, length=int(512 * 0.32), width=24)
    draw = ImageDraw.Draw(img, 'RGBA')
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 110)
    except Exception:
        font = ImageFont.load_default()
    text = 'EC'
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (512 - tw) // 2 - bbox[0]
    y = 380 - bbox[1]
    draw.text((x + 3, y + 3), text, font=font, fill=(0, 0, 0, 180))
    draw.text((x, y), text, font=font, fill=AMBER)
    img.save(os.path.join(OUT, 'icon-512.png'))
    print('wrote icon-512.png')


def feature_graphic():
    w, h = 1024, 500
    img = radial_bg(w, h)
    # Left third: emblem. Right two-thirds: title + tagline.
    draw_swords(img, 180, h // 2, length=140, width=16)
    draw = ImageDraw.Draw(img, 'RGBA')
    try:
        title_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 72)
        tag_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 26)
    except Exception:
        title_font = ImageFont.load_default()
        tag_font = ImageFont.load_default()

    title = 'EMBLEM CARDS'
    tag = 'Tactical card battles. Deploy, attack, outwit.'
    # Measure titles and center the right-side text block between the emblem
    # (~x=260) and the right edge so nothing clips on narrow canvases.
    tbox = draw.textbbox((0, 0), title, font=title_font)
    tag_box = draw.textbbox((0, 0), tag, font=tag_font)
    right_edge = w - 40
    title_w = tbox[2] - tbox[0]
    tag_w = tag_box[2] - tag_box[0]
    tx = max(320, right_edge - max(title_w, tag_w))
    draw.text((tx + 3, h // 2 - 60 + 3), title, font=title_font, fill=(0, 0, 0, 180))
    draw.text((tx, h // 2 - 60), title, font=title_font, fill=AMBER)
    draw.text((tx, h // 2 + 45), tag, font=tag_font, fill=(229, 231, 235, 255))
    img.save(os.path.join(OUT, 'feature-graphic.png'))
    print('wrote feature-graphic.png')


def main():
    icon_512()
    feature_graphic()
    print('wrote assets to', OUT)


if __name__ == '__main__':
    main()
