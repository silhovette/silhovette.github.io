"""Build WebP display sizes from the original photos; keep originals untouched.

Run with Python and Pillow: python tools/build-photo-webp.py
"""
import argparse
from pathlib import Path

from PIL import Image, ImageOps


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--chapter-banners-only", action="store_true", help="Build chapter crops from the existing hero.webp files only")
parser.add_argument("--chapter-content-only", action="store_true", help="Build responsive chapter content images only")
args = parser.parse_args()

root = Path(__file__).resolve().parents[1]
photos = root / "assets" / "photos"
output = photos / "webp"
output.mkdir(exist_ok=True)
sources = [photos / "avatar.png", *sorted((photos / "editorial").glob("*.jpg"))]
if args.chapter_banners_only or args.chapter_content_only:
    sources = []

for source in sources:
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        profile = original.info.get("icc_profile")
        variants = [("", 3200, 88)] if source.stem != "avatar" else [("", 1024, 90)]
        if source.stem != "avatar":
            variants += [("-1800", 1800, 86), ("-900", 900, 86)]
        for suffix, size, quality in variants:
            resized = image.copy()
            resized.thumbnail((size, size), Image.Resampling.LANCZOS)
            target = output / f"{source.stem}{suffix}.webp"
            options = {"quality": quality, "method": 6}
            if profile:
                options["icc_profile"] = profile
            resized.save(target, "WEBP", **options)
            print(f"{target.relative_to(root)}: {resized.width}x{resized.height}, {target.stat().st_size:,} bytes", flush=True)

# Chapter banners only display a shallow crop. Avoid decoding the entire
# 7.7-megapixel photograph for an image that is about 100–220 CSS pixels tall.
for source in ([] if args.chapter_content_only else sorted(photos.glob("*/hero.webp"))):
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        options = {"quality": 88, "method": 6}
        if original.info.get("icc_profile"):
            options["icc_profile"] = original.info["icc_profile"]
        center = (0.5, 0.65 if source.parent.name == "3mechanica" else 0.5)
        for width in (900, 1800):
            resized = ImageOps.fit(image, (width, round(width / 3.4)), Image.Resampling.LANCZOS, centering=center)
            target = source.with_name(f"hero-banner-{width}.webp")
            resized.save(target, "WEBP", **options)
            print(f"{target.relative_to(root)}: {resized.width}x{resized.height}, {target.stat().st_size:,} bytes", flush=True)

# Match the visible content crops, reducing decoded pixels as well as file size.
if not args.chapter_banners_only:
    for name, ratio, widths in (("02", 44 / 50, (600, 1200)), ("01", 55 / 23, (720, 1440))):
        source = photos / "1materia" / f"{name}.webp"
        if not source.exists():
            print(f"Skipping {source.relative_to(root)}: source not present", flush=True)
            continue
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original).convert("RGB")
            options = {"quality": 85, "method": 6}
            if original.info.get("icc_profile"):
                options["icc_profile"] = original.info["icc_profile"]
            for width in widths:
                resized = ImageOps.fit(image, (width, round(width / ratio)), Image.Resampling.LANCZOS)
                target = source.with_name(f"{name}-display-{width}.webp")
                resized.save(target, "WEBP", **options)
                print(f"{target.relative_to(root)}: {resized.width}x{resized.height}, {target.stat().st_size:,} bytes", flush=True)
