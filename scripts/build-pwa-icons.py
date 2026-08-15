#!/usr/bin/env python3
"""Build sharp PWA / Chrome install icons from the 1024px brand artwork.

Chrome Add-to-Home-Screen was using dist/favicon.ico (16/32px). Those
frames look faded and pixelated when Android upscales them to ~192px.
This script crops the inner mark out of icon.png and writes 192/512
any + maskable PNGs, an Apple touch icon, and a multi-size ICO.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "images" / "icon.png"
PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"
ASSETS = ROOT / "assets" / "images"

BG = (7, 8, 10, 255)


def crop_mark(src: Image.Image) -> Image.Image:
    """Remove the empty outer canvas so the mark can fill the home-screen tile."""
    rgba = src.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size

    def is_outer(color: tuple[int, int, int, int]) -> bool:
        red, green, blue, alpha = color
        return alpha < 8 or (red < 20 and green < 22 and blue < 28)

    min_x, min_y, max_x, max_y = width, height, 0, 0
    for y in range(height):
        for x in range(width):
            if not is_outer(pixels[x, y]):
                if x < min_x:
                    min_x = x
                if y < min_y:
                    min_y = y
                if x > max_x:
                    max_x = x
                if y > max_y:
                    max_y = y

    pad = 8
    box = (
        max(0, min_x - pad),
        max(0, min_y - pad),
        min(width, max_x + 1 + pad),
        min(height, max_y + 1 + pad),
    )
    return rgba.crop(box)


def place_on_canvas(mark: Image.Image, size: int, fill: float) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BG)
    target = max(1, int(size * fill))
    scaled = mark.resize((target, target), Image.Resampling.LANCZOS)
    offset = (size - target) // 2
    canvas.paste(scaled, (offset, offset), scaled)
    return canvas


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGBA").save(path, format="PNG", optimize=True)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing source icon: {SOURCE}")

    mark = crop_mark(Image.open(SOURCE))
    ICONS.mkdir(parents=True, exist_ok=True)

    any_1024 = place_on_canvas(mark, 1024, 0.92)
    maskable_1024 = place_on_canvas(mark, 1024, 0.72)

    sizes = {
        ICONS / "icon-192.png": (any_1024, 192),
        ICONS / "icon-512.png": (any_1024, 512),
        ICONS / "icon-512-maskable.png": (maskable_1024, 512),
        ICONS / "apple-touch-icon.png": (any_1024, 180),
        ICONS / "favicon-32.png": (any_1024, 32),
        ICONS / "favicon-48.png": (any_1024, 48),
        ICONS / "favicon-192.png": (any_1024, 192),
    }
    for path, (source, size) in sizes.items():
        save_png(source.resize((size, size), Image.Resampling.LANCZOS), path)

    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (256, 256)]
    PUBLIC.mkdir(parents=True, exist_ok=True)
    any_1024.convert("RGBA").save(PUBLIC / "favicon.ico", format="ICO", sizes=ico_sizes)

    # Give Expo a sharp favicon source instead of the old 48px bitmap.
    save_png(any_1024.resize((192, 192), Image.Resampling.LANCZOS), ASSETS / "favicon.png")
    save_png(any_1024, ASSETS / "pwa-icon.png")
    save_png(maskable_1024, ASSETS / "pwa-icon-maskable.png")

    print("wrote PWA icons to", ICONS)
    for path in sorted(ICONS.glob("*")):
        with Image.open(path) as image:
            print(f"  {path.name:28} {image.size} {image.mode}")


if __name__ == "__main__":
    main()
