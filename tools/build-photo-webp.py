"""Build WebP display sizes from the original photos; keep originals untouched.

Run with Python and Pillow: python tools/build-photo-webp.py
"""
from pathlib import Path

from PIL import Image, ImageOps


root = Path(__file__).resolve().parents[1]
photos = root / "assets" / "photos"
output = photos / "webp"
output.mkdir(exist_ok=True)
sources = [photos / "avatar.png", *sorted((photos / "editorial").glob("*.jpg"))]

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
