"""Remove the baked neutral checkerboard background from generated sprite sheets."""

from collections import deque
from pathlib import Path
import sys

from PIL import Image


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, _ = pixel
    return min(r, g, b) >= 198 and max(r, g, b) - min(r, g, b) <= 13


def clean(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    pixels = image.load()
    width, height = image.size
    queue: deque[tuple[int, int]] = deque()
    visited = bytearray(width * height)
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))
    while queue:
        x, y = queue.popleft()
        offset = y * width + x
        if visited[offset]:
            continue
        visited[offset] = 1
        if not is_background(pixels[x, y]):
            continue
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        if x:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))
    image.save(path)


if __name__ == "__main__":
    for filename in sys.argv[1:]:
        clean(Path(filename))
