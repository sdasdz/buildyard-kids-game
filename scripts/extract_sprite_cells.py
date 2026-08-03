"""Extract a normalized 4x4 sprite sheet into isolated transparent PNG cells."""

from pathlib import Path
import sys

from PIL import Image


if __name__ == "__main__":
    if len(sys.argv) < 4:
        raise SystemExit("usage: extract_sprite_cells.py SHEET OUTPUT_DIR NAME...")
    sheet = Image.open(sys.argv[1]).convert("RGBA")
    output_dir = Path(sys.argv[2])
    names = sys.argv[3:]
    if len(names) != 16:
        raise SystemExit("exactly 16 names are required")
    output_dir.mkdir(parents=True, exist_ok=True)
    cell_w = sheet.width // 4
    cell_h = sheet.height // 4
    for index, name in enumerate(names):
        col = index % 4
        row = index // 4
        tile = sheet.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
        tile.save(output_dir / f"{name}.png", optimize=True)
