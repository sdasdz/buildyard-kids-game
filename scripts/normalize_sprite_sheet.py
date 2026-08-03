"""Normalize a 4x4 generated sprite sheet and remove chroma-green safely."""

from pathlib import Path
import sys

from PIL import Image


GRID = 4
CELL = 300
EDGE_GUARD = 6


def is_chroma_green(r: int, g: int, b: int) -> bool:
    return g > 105 and g > r * 1.22 and g > b * 1.22


def normalize(source: Path, target: Path) -> None:
    image = Image.open(source).convert("RGBA")
    output = Image.new("RGBA", (CELL * GRID, CELL * GRID), (0, 0, 0, 0))
    for row in range(GRID):
        for col in range(GRID):
            left = round(col * image.width / GRID)
            top = round(row * image.height / GRID)
            right = round((col + 1) * image.width / GRID)
            bottom = round((row + 1) * image.height / GRID)
            tile = image.crop((left + 3, top + 3, right - 3, bottom - 3))
            tile = tile.resize((CELL, CELL), Image.Resampling.LANCZOS)
            pixels = tile.load()
            for y in range(CELL):
                for x in range(CELL):
                    r, g, b, a = pixels[x, y]
                    if is_chroma_green(r, g, b):
                        pixels[x, y] = (r, g, b, 0)
                    elif x < EDGE_GUARD or y < EDGE_GUARD or x >= CELL - EDGE_GUARD or y >= CELL - EDGE_GUARD:
                        pixels[x, y] = (r, g, b, 0)
            output.alpha_composite(tile, (col * CELL, row * CELL))
    target.parent.mkdir(parents=True, exist_ok=True)
    output.save(target, optimize=True)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: normalize_sprite_sheet.py SOURCE TARGET")
    normalize(Path(sys.argv[1]), Path(sys.argv[2]))
