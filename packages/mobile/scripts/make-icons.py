#!/usr/bin/env python3
"""Generate app icon, adaptive icon, and splash PNGs for the Expo app.

Kept intentionally tiny: two overlapping sword-pommel shapes forming an
"X" emblem, plus "EC" text underneath. Uses PIL only — no external fonts,
so the letters rely on the default bitmap font and look deliberately chunky.

Run:  python3 scripts/make-icons.py
Output: assets/icon.png, assets/adaptive-icon.png, assets/splash-icon.png, assets/favicon.png
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(HERE, 'assets')
os.makedirs(ASSETS, exist_ok=True)

BG = (11, 13, 18, 255)      # #0b0d12
AMBER = (251, 191, 36, 255) # #fbbf24
RED = (220, 38, 38, 255)    # #dc2626
PURPLE = (168, 85, 247, 255)

def radial_bg(size):
    """Dark background with a subtle radial glow from amber at center."""
    img = Image.new('RGBA', (size, size), BG)
    cx, cy = size // 2, size // 2
    pixels = img.load()
    max_r = math.hypot(cx, cy)
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy) / max_r
            # Glow falls off steeply
            t = max(0.0, 1.0 - d * 1.6)
            r = int(BG[0] + (AMBER[0] - BG[0]) * t * 0.15)
            g = int(BG[1] + (AMBER[1] - BG[1]) * t * 0.12)
            b = int(BG[2] + (AMBER[2] - BG[2]) * t * 0.08)
            pixels[x, y] = (r, g, b, 255)
    return img

def draw_crossed_swords(img, color_a=AMBER, color_b=RED, scale=1.0, alpha=255):
    """Two crossed diamond-shape swords forming an X."""
    size = img.size[0]
    cx, cy = size // 2, size // 2
    draw = ImageDraw.Draw(img, 'RGBA')

    # Sword as a long narrow diamond. Draw two rotated via polygons.
    length = int(size * 0.55 * scale)
    width = max(12, int(size * 0.045 * scale))

    def sword(angle_deg, color):
        ang = math.radians(angle_deg)
        cos_a, sin_a = math.cos(ang), math.sin(ang)
        # Diamond: tip, +side, tail, -side
        pts_local = [
            (length, 0),
            (width, width),
            (-length + width * 2, 0),
            (width, -width),
        ]
        pts = []
        for lx, ly in pts_local:
            x = cx + lx * cos_a - ly * sin_a
            y = cy + lx * sin_a + ly * cos_a
            pts.append((x, y))
        col = (color[0], color[1], color[2], alpha)
        draw.polygon(pts, fill=col, outline=(0, 0, 0, alpha))

    sword(35, color_a)
    sword(-35, color_b)

    # Center pommel dot
    r = int(size * 0.045 * scale)
    draw.ellipse(
        (cx - r, cy - r, cx + r, cy + r),
        fill=(AMBER[0], AMBER[1], AMBER[2], alpha),
        outline=(0, 0, 0, alpha),
    )

def draw_wordmark(img, text='EC', color=AMBER, size_frac=0.18):
    w, h = img.size
    draw = ImageDraw.Draw(img, 'RGBA')
    try:
        font = ImageFont.truetype(
            '/System/Library/Fonts/Helvetica.ttc', int(h * size_frac),
        )
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (w - tw) // 2 - bbox[0]
    y = int(h * 0.78) - bbox[1]
    # Shadow
    draw.text((x + 2, y + 2), text, font=font, fill=(0, 0, 0, 180))
    draw.text((x, y), text, font=font, fill=color)


def icon(size=1024, transparent_bg=False):
    if transparent_bg:
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    else:
        img = radial_bg(size)
    draw_crossed_swords(img)
    draw_wordmark(img)
    return img


def splash(size=1024):
    img = Image.new('RGBA', (size, size), BG)
    # Centered emblem only, bigger
    em = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw_crossed_swords(em, scale=0.9)
    img.paste(em, (0, 0), em)
    return img


def main():
    icon(1024).save(os.path.join(ASSETS, 'icon.png'))
    # Adaptive icon foreground: transparent bg, icon content centered in safe zone
    foreground = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    inner = icon(672, transparent_bg=True)
    foreground.paste(inner, ((1024 - 672) // 2, (1024 - 672) // 2), inner)
    foreground.save(os.path.join(ASSETS, 'adaptive-icon.png'))
    splash(1024).save(os.path.join(ASSETS, 'splash-icon.png'))
    icon(48).save(os.path.join(ASSETS, 'favicon.png'))
    print('wrote icon.png, adaptive-icon.png, splash-icon.png, favicon.png to', ASSETS)

if __name__ == '__main__':
    main()
