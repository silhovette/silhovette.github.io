"""Generate responsive gallery previews; leave the original photographs untouched.

Run with Python and Pillow: python tools/build-miniature-previews.py
"""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1] / "assets" / "miniatures"
output = root / "previews"
output.mkdir(exist_ok=True)
for source in sorted(root.iterdir()):
    if source.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
        continue
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        for width in (420, 840):
            preview = image.copy()
            preview.thumbnail((width, round(width * 4 / 3)), Image.Resampling.LANCZOS)
            preview.save(output / f"{source.name}.{width}.webp", quality=82, method=6)
print("Miniature previews generated.")
