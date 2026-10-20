"""Assemble frames captured from the running browser canvas. No synthesized frames."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parent.parent
files = sorted((root / "docs" / "frames").glob("*.png"))
if len(files) != 120:
    raise SystemExit(f"Expected 120 real captured frames, got {len(files)}")
frames = [Image.open(p).convert("RGB") for p in files]
palette = frames[30].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
images = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in frames]
images[0].save(root / "docs" / "demo.gif", save_all=True,
               append_images=images[1:], duration=100, loop=0, optimize=False)
print(f"Saved 12 seconds / {len(images)} frames / {files[0].name}..{files[-1].name}")
